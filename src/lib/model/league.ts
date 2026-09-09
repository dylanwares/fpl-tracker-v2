/**
 * The mini-league (product spec §3) — the page this app exists to win.
 *
 * Two things here go beyond raw ownership, because raw ownership is the wrong
 * tool in a five-manager league:
 *
 * **Effective ownership.** A player started by three of five managers and
 * captained by two is not "60% owned" — he is worth 100% of a squad's exposure,
 * because a captain counts twice. EO = (starters + captains) / managers.
 *
 * **Swing.** `xP × (myExposure − EO)` is the only number that says what a
 * player actually does to my *rank*. Positive means I gain on the league when
 * he returns; negative means I bleed places while he does well for everyone
 * else. It unifies threats and differentials into one signed figure, and it is
 * the thing to look at before making a transfer.
 *
 * **The honest caveat**, stated on the page: rival picks for the upcoming
 * gameweek are private until the deadline, so every exposure figure is computed
 * from the last confirmed squads. Rivals will transfer before the deadline.
 */
import { cacheLife, cacheTag } from "next/cache";
import { config, requireEntryId, requireLeagueId } from "@/lib/config";
import { getEntryHistory, getLeagueStandings } from "@/lib/fpl/api";
import { FplTag } from "@/lib/fpl/client";
import { resolveGameweekState } from "@/lib/fpl/gameweek";
import type { FplChip } from "@/lib/fpl/types";
import { getGameData } from "./game";
import { getPlayerPool, pooledById, type PlayerPool, type PooledPlayer } from "./pool";
import { fetchLatestPicks, type SquadPick } from "./squad";

export interface ChipWindow {
  name: string;
  label: string;
  start: number;
  end: number;
  used: boolean;
  usedInEvent: number | null;
}

export interface LeagueManager {
  entryId: number;
  entryName: string;
  managerName: string;
  rank: number;
  lastRank: number;
  /** Places gained since last gameweek; positive is up the table. */
  movement: number;
  total: number;
  eventTotal: number;
  isMe: boolean;
  activeChip: string | null;
  starters: SquadPick[];
  bench: SquadPick[];
  chips: ChipWindow[];
  /** Chips still available in the current half of the season. */
  chipsLeftNow: string[];
  /** Starting XI xP for the next gameweek, captain counted twice. */
  projectedNext: number | null;
  projectedHorizon: number | null;
}

export interface Exposure {
  entry: PooledPlayer;
  /** Managers with him in their starting XI. */
  starters: number;
  captains: number;
  /** (starters + captains) / managers — a captain is two squads' worth. */
  effectiveOwnership: number;
  /** 0 if I don't start him, 1 if I do, 2 if he is my captain. */
  myExposure: number;
  ownedByMe: boolean;
  /** Which rivals own him, for the tooltip. */
  ownedBy: string[];
  swingNext: number | null;
  swingHorizon: number | null;
}

export interface LeagueView {
  leagueName: string;
  size: number;
  /** The gameweek the squads are confirmed for. */
  gameweek: number;
  planningGameweek: number | null;
  managers: LeagueManager[];
  me: LeagueManager | null;
  /** Points to the manager directly above me, null if I'm top. */
  gapAbove: number | null;
  gapBelow: number | null;
  gapToLeader: number | null;
  exposures: Exposure[];
  pool: PlayerPool;
}

const chipLabels: Record<string, string> = {
  wildcard: "Wildcard",
  freehit: "Free Hit",
  bboost: "Bench Boost",
  "3xc": "Triple Captain",
};

/**
 * Which chips a manager has left, window by window. A chip used in GW3 closes
 * the first-half window only — the second-half copy is untouched.
 */
export function chipWindowsFor(
  definitions: FplChip[],
  used: { name: string; event: number }[],
): ChipWindow[] {
  return definitions.map((chip) => {
    const match = used.find(
      (entry) =>
        entry.name === chip.name &&
        entry.event >= chip.start_event &&
        entry.event <= chip.stop_event,
    );
    return {
      name: chip.name,
      label: chipLabels[chip.name] ?? chip.name,
      start: chip.start_event,
      end: chip.stop_event,
      used: match !== undefined,
      usedInEvent: match?.event ?? null,
    };
  });
}

/** Starting XI xP, captain counted twice — what a squad is projected to score. */
function projectedPoints(
  starters: SquadPick[],
  read: (pick: SquadPick) => number | null,
): number | null {
  let total = 0;
  let any = false;
  for (const pick of starters) {
    const value = read(pick);
    if (value === null) continue;
    any = true;
    total += pick.isCaptain ? value * 2 : value;
  }
  return any ? total : null;
}

export async function getLeagueView(horizon = config.defaultHorizon): Promise<LeagueView | null> {
  "use cache";
  cacheLife("fplData");
  cacheTag(FplTag.league);
  cacheTag(FplTag.entry);

  const myEntryId = requireEntryId();
  const leagueId = requireLeagueId();

  const [game, pool, standings] = await Promise.all([
    getGameData(),
    getPlayerPool(horizon),
    getLeagueStandings(leagueId),
  ]);

  const state = resolveGameweekState(game.events);
  const from = state.current?.id ?? state.previous?.id ?? 1;
  const byId = pooledById(pool);
  const results = standings.standings.results;
  if (results.length === 0) return null;

  const loaded = await Promise.all(
    results.map(async (row) => {
      const [picks, history] = await Promise.all([
        fetchLatestPicks(row.entry, from),
        getEntryHistory(row.entry),
      ]);
      return { row, picks, history };
    }),
  );

  const gameweek = loaded.find((entry) => entry.picks !== null)?.picks?.gameweek ?? from;

  const managers: LeagueManager[] = loaded.map(({ row, picks, history }) => {
    const squad: SquadPick[] = (picks?.picks.picks ?? [])
      .map((pick) => {
        const pooled = byId.get(pick.element);
        if (!pooled) return null;
        return {
          entry: pooled,
          position: pick.position,
          isStarter: pick.position <= 11,
          isCaptain: pick.is_captain,
          isViceCaptain: pick.is_vice_captain,
          multiplier: pick.multiplier,
        } satisfies SquadPick;
      })
      .filter((pick): pick is SquadPick => pick !== null)
      .sort((a, b) => a.position - b.position);

    const starters = squad.filter((pick) => pick.isStarter);
    const chips = chipWindowsFor(game.chips, history.chips ?? []);
    const planning = state.next?.id ?? state.current?.id ?? 1;

    return {
      entryId: row.entry,
      entryName: row.entry_name,
      managerName: row.player_name,
      rank: row.rank,
      lastRank: row.last_rank,
      movement: row.last_rank === 0 ? 0 : row.last_rank - row.rank,
      total: row.total,
      eventTotal: row.event_total,
      isMe: row.entry === myEntryId,
      activeChip: picks?.picks.active_chip ?? null,
      starters,
      bench: squad.filter((pick) => !pick.isStarter),
      chips,
      chipsLeftNow: chips
        .filter((chip) => !chip.used && planning >= chip.start && planning <= chip.end)
        .map((chip) => chip.label),
      projectedNext: projectedPoints(starters, (pick) => pick.entry.xpNext),
      projectedHorizon: projectedPoints(starters, (pick) => pick.entry.xpHorizon),
    };
  });

  managers.sort((a, b) => a.rank - b.rank);
  const me = managers.find((manager) => manager.isMe) ?? null;
  const myIndex = me ? managers.indexOf(me) : -1;

  return {
    leagueName: standings.league.name,
    size: managers.length,
    gameweek,
    planningGameweek: pool.planningGameweek,
    managers,
    me,
    gapAbove: myIndex > 0 ? managers[myIndex - 1].total - (me?.total ?? 0) : null,
    gapBelow:
      myIndex >= 0 && myIndex < managers.length - 1
        ? (me?.total ?? 0) - managers[myIndex + 1].total
        : null,
    gapToLeader: me && myIndex > 0 ? managers[0].total - me.total : null,
    exposures: buildExposures(managers, myEntryId),
    pool,
  };
}

/**
 * Effective ownership across the league, and what each player does to my rank.
 *
 * Only starting XIs count. A player on three benches is owned by three rivals
 * and scores for none of them, so counting him as owned would overstate the
 * threat considerably.
 */
export function buildExposures(managers: LeagueManager[], myEntryId: number): Exposure[] {
  const size = managers.length;
  if (size === 0) return [];

  const rows = new Map<number, Exposure>();

  for (const manager of managers) {
    for (const pick of manager.starters) {
      const id = pick.entry.player.id;
      let row = rows.get(id);
      if (!row) {
        row = {
          entry: pick.entry,
          starters: 0,
          captains: 0,
          effectiveOwnership: 0,
          myExposure: 0,
          ownedByMe: false,
          ownedBy: [],
          swingNext: null,
          swingHorizon: null,
        };
        rows.set(id, row);
      }

      row.starters += 1;
      // A captain counts as two squads' worth, not three, even when the pick
      // was made under a Triple Captain chip. Exposure here is forward-looking
      // and the chip does not carry into the next gameweek.
      if (pick.isCaptain) row.captains += 1;
      row.ownedBy.push(manager.managerName);

      if (manager.entryId === myEntryId) {
        row.ownedByMe = true;
        row.myExposure = pick.isCaptain ? 2 : 1;
      }
    }
  }

  for (const row of rows.values()) {
    row.effectiveOwnership = (row.starters + row.captains) / size;
    const edge = row.myExposure - row.effectiveOwnership;
    row.swingNext = row.entry.xpNext === null ? null : row.entry.xpNext * edge;
    row.swingHorizon = row.entry.xpHorizon === null ? null : row.entry.xpHorizon * edge;
  }

  return [...rows.values()];
}

/**
 * High-xP players nobody in the league starts — transfer candidates rather than
 * current holdings, which is the actionable half of §3.4.
 */
export function unownedCandidates(view: LeagueView, limit = 8): PooledPlayer[] {
  const owned = new Set(view.exposures.map((row) => row.entry.player.id));
  return view.pool.players
    .filter((entry) => !owned.has(entry.player.id) && entry.xpHorizon !== null)
    .sort((a, b) => (b.xpHorizon ?? 0) - (a.xpHorizon ?? 0))
    .slice(0, limit);
}
