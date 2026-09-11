import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ErrorState, WarningBanner } from "@/components/ui/states";
import { config } from "@/lib/config";
import { buildSchedule, runFor } from "@/lib/model/fixtures";
import { getAllFixtures, getGameData } from "@/lib/model/game";
import { getPlayerDetail } from "@/lib/model/detail";
import { byExpectedPoints, getPlayerPool, meetsMinutesThreshold } from "@/lib/model/pool";
import { horizonEvents, resolveGameweekState } from "@/lib/fpl/gameweek";

/**
 * Stage 2 review page — the data layer with the covers off.
 *
 * Deliberately not in the tab bar: it exists to prove the normalisation and the
 * projection join against real data, and it gets deleted at Stage 9. Everything
 * on it is live; nothing here is mocked.
 */
export default async function DebugPage() {
  return (
    <div className="flex flex-col gap-3 lg:gap-4">
      <PoolSummary />
      <TopProjected />
      <Unprojected />
      <SheetPayload />
      <FixtureRuns />
    </div>
  );
}

async function PoolSummary() {
  let data;
  try {
    const pool = await getPlayerPool();
    const game = await getGameData();
    const withMinutes = pool.players.filter(meetsMinutesThreshold).length;
    data = {
      pool,
      rows: [
        ["Players normalised", String(pool.players.length)],
        ["Teams", String(game.teams.length)],
        ["Planning for", pool.planningGameweek === null ? "—" : `GW${pool.planningGameweek}`],
        [
          "Projection window",
          pool.gameweeks.length === 0
            ? "—"
            : `GW${pool.gameweeks[0]}–GW${pool.gameweeks[pool.gameweeks.length - 1]}`,
        ],
        ["Unprojected", String(pool.unprojectedCount)],
        [`Over ${config.minutesThreshold * 100}% minutes`, String(withMinutes)],
      ] as [string, string][],
    };
  } catch (error) {
    return <ErrorState message="Data layer failed" hint={String(error)} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {!data.pool.projectionsAvailable && (
        <WarningBanner
          message="Expected points feed unavailable"
          detail="Every other number on this page is live. xP columns stay blank — there is no fallback source."
        />
      )}
      <Card>
        <CardHeader title="Player pool" />
        <CardBody>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-[14px] sm:grid-cols-3">
            {data.rows.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-1">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-2">
                  {label}
                </dt>
                <dd className="text-[14px] font-medium text-text-1">{value}</dd>
              </div>
            ))}
          </dl>
        </CardBody>
      </Card>
    </div>
  );
}

async function TopProjected() {
  let rows;
  try {
    const pool = await getPlayerPool();
    rows = [...pool.players].sort(byExpectedPoints("xpHorizon")).slice(0, 12);
  } catch (error) {
    return <ErrorState message="Could not build the pool" hint={String(error)} />;
  }

  return (
    <Card>
      <CardHeader title={`Top projected — next ${config.defaultHorizon} gameweeks`} />
      <CardBody>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-text-3">
              <th className="pb-2 font-semibold">Player</th>
              <th className="pb-2 font-semibold">Team</th>
              <th className="pb-2 font-semibold">Pos</th>
              <th className="pb-2 text-right font-semibold">£m</th>
              <th className="pb-2 text-right font-semibold">Pts/£m</th>
              <th className="pb-2 text-right font-semibold">xP next</th>
              <th className="pb-2 text-right font-semibold">xP {config.defaultHorizon}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr key={entry.player.id} className="border-t border-border">
                <td className="py-1.5 font-medium text-text-1">{entry.player.name}</td>
                <td className="py-1.5 text-text-2">{entry.team?.shortName ?? "—"}</td>
                <td className="py-1.5 text-text-2">{entry.player.position}</td>
                <td className="py-1.5 text-right tabular-nums">
                  {entry.player.price.toFixed(1)}
                </td>
                <td className="py-1.5 text-right tabular-nums text-text-2">
                  {entry.player.pointsPerMillion.toFixed(1)}
                </td>
                <td className="py-1.5 text-right tabular-nums">
                  {entry.xpNext === null ? "—" : entry.xpNext.toFixed(1)}
                </td>
                <td className="py-1.5 text-right font-medium tabular-nums">
                  {entry.xpHorizon === null ? "—" : entry.xpHorizon.toFixed(1)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardBody>
    </Card>
  );
}

/** The rule that matters: these are real players, and none of them shows a 0. */
async function Unprojected() {
  let rows;
  try {
    const pool = await getPlayerPool();
    rows = pool.players
      .filter((entry) => !entry.isProjected && entry.player.minutes > 0)
      .sort((a, b) => b.player.minutes - a.player.minutes)
      .slice(0, 10);
  } catch (error) {
    return <ErrorState message="Could not build the pool" hint={String(error)} />;
  }

  return (
    <Card>
      <CardHeader title="Unprojected, but playing" />
      <CardBody>
        <p className="mb-3 text-[12px] text-text-3">
          Missing from the xP feed despite real minutes — shown as “—”, never 0.
        </p>
        {rows.length === 0 ? (
          <p className="text-[13px] text-text-3">Every player with minutes is projected.</p>
        ) : (
          <ul className="flex flex-col gap-1 text-[13px]">
            {rows.map((entry) => (
              <li key={entry.player.id} className="flex justify-between gap-4">
                <span className="text-text-1">
                  {entry.player.name}{" "}
                  <span className="text-text-3">
                    {entry.team?.shortName ?? "—"} · {entry.player.position}
                  </span>
                </span>
                <span className="tabular-nums text-text-2">{entry.player.minutes} mins</span>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}

/** The payload behind the universal player sheet, for one real player. */
async function SheetPayload() {
  let detail;
  try {
    const pool = await getPlayerPool();
    const top = [...pool.players].sort(byExpectedPoints("xpHorizon"))[0];
    detail = top ? await getPlayerDetail(top.player.id) : null;
  } catch (error) {
    return <ErrorState message="Could not build player detail" hint={String(error)} />;
  }

  if (!detail) return <ErrorState message="No player detail" />;

  return (
    <Card>
      <CardHeader title={`Player sheet payload — ${detail.name}`} />
      <CardBody>
        <p className="mb-3 text-[12px] text-text-3">
          Difficulty source: {detail.difficultySource}. Selected by {detail.selectedBy}%.
        </p>
        <ul className="flex flex-col gap-1 text-[13px]">
          {detail.fixtures.map((fixture) => (
            <li key={fixture.gameweek} className="flex justify-between gap-4">
              <span className="text-text-2">GW{fixture.gameweek}</span>
              <span className="text-text-1">
                {fixture.matches.length === 0
                  ? "blank"
                  : fixture.matches
                      .map((m) => `${m.isHome ? m.opponent : m.opponent.toLowerCase()} (FDR ${m.difficulty})`)
                      .join(" + ")}
              </span>
              <span className="tabular-nums text-text-2">
                xP {fixture.points === null ? "–" : fixture.points.toFixed(1)} · {fixture.rag}
              </span>
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

async function FixtureRuns() {
  let data;
  try {
    const [game, fixtures] = await Promise.all([getGameData(), getAllFixtures()]);
    const schedule = buildSchedule(fixtures);
    const state = resolveGameweekState(game.events);
    const from = state.next?.id ?? state.current?.id ?? 1;
    const gameweeks = horizonEvents(game.events, from, config.defaultHorizon);

    data = {
      gameweeks,
      teams: game.teams.map((team) => ({
        team,
        run: runFor(schedule, team.id, gameweeks),
      })),
    };
  } catch (error) {
    return <ErrorState message="Could not build fixtures" hint={String(error)} />;
  }

  return (
    <Card>
      <CardHeader title="Fixture schedule" />
      <CardBody>
        <p className="mb-3 text-[12px] text-text-3">
          Home in caps, away in lower case. A blank shows as “—”; a double lists both.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-[12px]">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-[0.06em] text-text-3">
                <th className="pb-2 font-semibold">Team</th>
                {data.gameweeks.map((gameweek) => (
                  <th key={gameweek} className="pb-2 font-semibold">
                    GW{gameweek}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.teams.map(({ team, run }) => (
                <tr key={team.id} className="border-t border-border">
                  <td className="py-1.5 font-medium text-text-1">{team.shortName}</td>
                  {run.map((entry) => (
                    <td key={entry.gameweek} className="py-1.5 text-text-2">
                      {entry.fixtures.length === 0
                        ? "—"
                        : entry.fixtures
                            .map((fixture) => {
                              const opponent = data.teams.find(
                                (row) => row.team.id === fixture.opponentId,
                              );
                              const label = opponent?.team.shortName ?? String(fixture.opponentId);
                              return fixture.isHome ? label.toUpperCase() : label.toLowerCase();
                            })
                            .join(" + ")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}
