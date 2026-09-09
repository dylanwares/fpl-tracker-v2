/**
 * Analysis loader (product spec §4) — server only.
 *
 * Every finished gameweek needs one `event/{gw}/live/` call, but each one is
 * cached as a trimmed 6.4KB map under the `settled` profile, so by May this is
 * 38 entries fetched once each rather than 38 large requests per page view.
 */
import { cacheLife, cacheTag } from "next/cache";
import { requireEntryId, requireLeagueId } from "@/lib/config";
import { FplTag } from "@/lib/fpl/client";
import { getEntryHistory, getEntryTransfers, getLeagueStandings } from "@/lib/fpl/api";
import type { FplEvent } from "@/lib/fpl/types";
import {
  chipGain,
  summarise,
  TREND_THRESHOLD,
  type AnalysisView,
  type GameweekAnalysis,
  type TransferAnalysis,
} from "./analysis";
import { getGameData } from "./game";
import { getLivePoints, type LivePoints } from "./history";
import { fetchLatestPicks } from "./squad";

/** League average per gameweek, or null if the league can't be read. */
async function leagueAverages(): Promise<Map<number, number> | null> {
  try {
    const standings = await getLeagueStandings(requireLeagueId());
    const histories = await Promise.all(
      standings.standings.results.map((row) => getEntryHistory(row.entry)),
    );
    if (histories.length === 0) return null;

    const totals = new Map<number, { sum: number; count: number }>();
    for (const history of histories) {
      for (const week of history.current) {
        const row = totals.get(week.event) ?? { sum: 0, count: 0 };
        // Net of hits, to match what the standings count.
        row.sum += week.points - week.event_transfers_cost;
        row.count += 1;
        totals.set(week.event, row);
      }
    }

    return new Map([...totals].map(([event, row]) => [event, row.sum / row.count]));
  } catch (error) {
    console.error("[analysis] league averages unavailable", error);
    return null;
  }
}

export async function getAnalysis(): Promise<AnalysisView | null> {
  "use cache";
  cacheLife("fplData");
  cacheTag(FplTag.entry, FplTag.league, FplTag.live);

  const entryId = requireEntryId();
  const game = await getGameData();

  const [history, transfers, averages] = await Promise.all([
    getEntryHistory(entryId),
    getEntryTransfers(entryId),
    leagueAverages(),
  ]);

  const played = history.current;
  if (played.length === 0) return null;

  const eventsById = new Map(game.events.map((event) => [event.id, event]));
  const names = new Map(game.players.map((player) => [player.id, player.name]));

  // One live map per gameweek played. Settled gameweeks are cached for a month.
  const live = new Map<number, LivePoints>();
  await Promise.all(
    played.map(async (week) => {
      const event = eventsById.get(week.event);
      live.set(week.event, await getLivePoints(week.event, isSettled(event)));
    }),
  );

  // By May this is 38 gameweeks; fetched together rather than one after another.
  const squads = new Map(
    await Promise.all(
      played.map(
        async (week) =>
          [week.event, (await fetchLatestPicks(entryId, week.event))?.picks ?? null] as const,
      ),
    ),
  );

  const gameweeks: GameweekAnalysis[] = [];

  for (const week of played) {
    const points = live.get(week.event) ?? {};
    const squad = squads.get(week.event) ?? null;

    const starters = (squad?.picks ?? []).filter((pick) => pick.position <= 11);
    const bench = (squad?.picks ?? []).filter((pick) => pick.position > 11);
    const captainPick = (squad?.picks ?? []).find((pick) => pick.is_captain) ?? null;

    const scoreOf = (elementId: number) => points[elementId] ?? 0;

    const best = starters.reduce<{ elementId: number | null; points: number }>(
      (top, pick) =>
        scoreOf(pick.element) > top.points
          ? { elementId: pick.element, points: scoreOf(pick.element) }
          : top,
      { elementId: null, points: Number.NEGATIVE_INFINITY },
    );

    const captainPoints = captainPick ? scoreOf(captainPick.element) : 0;
    const bestPoints = best.elementId === null ? 0 : best.points;
    // The chip's multiplier applies to the loss too — a bad Triple Captain
    // costs three times the gap, not two.
    const multiplier = captainPick?.multiplier ?? 2;

    const benchScores = bench
      .map((pick) => ({ name: names.get(pick.element) ?? "Unknown", points: scoreOf(pick.element) }))
      .filter((entry) => entry.points > 0)
      .sort((a, b) => b.points - a.points);

    gameweeks.push({
      gameweek: week.event,
      points: week.points,
      netPoints: week.points - week.event_transfers_cost,
      benchPoints: week.points_on_bench,
      transfers: week.event_transfers,
      transferCost: week.event_transfers_cost,
      overallRank: week.overall_rank,
      gameAverage: eventsById.get(week.event)?.average_entry_score ?? 0,
      leagueAverage: averages?.get(week.event) ?? null,
      chip: squad?.active_chip ?? null,
      chipGain: chipGain(squad?.active_chip ?? null, captainPoints, week.points_on_bench),

      captain: {
        elementId: captainPick?.element ?? null,
        name: captainPick ? (names.get(captainPick.element) ?? "Unknown") : "—",
        points: captainPoints,
      },
      best: {
        elementId: best.elementId,
        name: best.elementId === null ? "—" : (names.get(best.elementId) ?? "Unknown"),
        points: bestPoints,
      },
      multiplier,
      captaincyLoss: Math.max(0, bestPoints - captainPoints) * multiplier,

      autoSubs: (squad?.automatic_subs ?? []).map((sub) => ({
        inName: names.get(sub.element_in) ?? "Unknown",
        outName: names.get(sub.element_out) ?? "Unknown",
        gained: scoreOf(sub.element_in) - scoreOf(sub.element_out),
      })),
      benchRegret: benchScores[0] ?? null,
    });
  }

  const transferRows: TransferAnalysis[] = transfers
    .filter((transfer) => played.some((week) => week.event === transfer.event))
    .map((transfer) => {
      const since = played.filter((week) => week.event >= transfer.event);
      const sum = (elementId: number) =>
        since.reduce((total, week) => total + ((live.get(week.event) ?? {})[elementId] ?? 0), 0);

      const cost =
        played.find((week) => week.event === transfer.event)?.event_transfers_cost ?? 0;
      const pointsIn = sum(transfer.element_in);
      const pointsOut = sum(transfer.element_out);

      return {
        gameweek: transfer.event,
        inId: transfer.element_in,
        outId: transfer.element_out,
        inName: names.get(transfer.element_in) ?? "Unknown",
        outName: names.get(transfer.element_out) ?? "Unknown",
        pointsIn,
        pointsOut,
        cost,
        net: pointsIn - pointsOut - cost,
      };
    })
    .sort((a, b) => b.gameweek - a.gameweek);

  const ranked = [...gameweeks].sort((a, b) => b.netPoints - a.netPoints);

  return {
    gameweeks,
    transfers: transferRows,
    totals: summarise(gameweeks, transferRows),
    best: ranked[0] ?? null,
    worst: ranked[ranked.length - 1] ?? null,
    isEarly: gameweeks.length < TREND_THRESHOLD,
  };
}

/** A gameweek whose points can never change again. */
function isSettled(event: FplEvent | undefined): boolean {
  return event?.finished === true && event.data_checked === true;
}
