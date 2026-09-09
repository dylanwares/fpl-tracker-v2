/**
 * Scout's data loader (product spec §5) — server only.
 *
 * Rows are deliberately flat and compact. All 654 of them are sent to the
 * client once, so filtering, sorting and comparing are instant and never hit
 * the network; the player sheet still loads on demand, because sending every
 * player's fixtures and per-90s as well would be an order of magnitude more.
 *
 * The table is league-aware. Global ownership tells you what the wider game is
 * doing; the column that decides your season is how many of *five* managers
 * own him.
 */
import { config } from "@/lib/config";
import { pointsPer90, type ScoutData, type ScoutPlayer } from "./scout";
import { resolveGameweekState, horizonEvents } from "@/lib/fpl/gameweek";
import type { FplFixture } from "@/lib/fpl/types";
import type { Difficulty } from "@/components/ui/fixture-cell";
import { difficultyFor } from "./difficulty";
import { buildSchedule, type Schedule } from "./fixtures";
import { getAllFixtures, getGameData } from "./game";
import { getLeagueView } from "./league";
import { getPlayerPool } from "./pool";

function forwardValue(
  schedule: Schedule,
  byFixtureId: Map<number, FplFixture>,
  teamId: number,
  gameweeks: number[],
): number {
  const byGameweek = schedule.get(teamId);
  if (gameweeks.length === 0) return 0;

  let total = 0;
  for (const gameweek of gameweeks) {
    for (const fixture of byGameweek?.get(gameweek) ?? []) {
      const raw = byFixtureId.get(fixture.fixtureId);
      total += 6 - (raw ? difficultyFor(fixture, raw) : (3 as Difficulty));
    }
  }
  return total / gameweeks.length;
}

/** The same scale, looking back — mean fixture value of the last `count` played. */
function pastValue(fixtures: FplFixture[], teamId: number, count: number): number {
  const played = fixtures
    .filter((fixture) => fixture.finished && (fixture.team_h === teamId || fixture.team_a === teamId))
    .sort((a, b) => (b.kickoff_time ?? "").localeCompare(a.kickoff_time ?? ""))
    .slice(0, count);

  if (played.length === 0) return 0;

  const total = played.reduce((sum, fixture) => {
    const isHome = fixture.team_h === teamId;
    const difficulty = isHome ? fixture.team_h_difficulty : fixture.team_a_difficulty;
    return sum + (6 - Math.min(5, Math.max(1, difficulty)));
  }, 0);

  return total / played.length;
}

export async function getScoutData(horizon = config.defaultHorizon): Promise<ScoutData> {
  const [game, pool, rawFixtures] = await Promise.all([
    getGameData(),
    getPlayerPool(horizon),
    getAllFixtures(),
  ]);

  // The league is a nice-to-have here: if it fails, Scout still works.
  let league = null;
  try {
    league = await getLeagueView(horizon);
  } catch (error) {
    console.error("[scout] league unavailable", error);
  }

  const schedule = buildSchedule(rawFixtures);
  const byFixtureId = new Map(rawFixtures.map((fixture) => [fixture.id, fixture]));
  const teamsById = new Map(game.teams.map((team) => [team.id, team]));

  const state = resolveGameweekState(game.events);
  const from = state.next?.id ?? state.current?.id ?? 1;
  const gameweeks = horizonEvents(game.events, from, horizon);

  const runByTeam = new Map<number, { run: number; swing: number }>();
  for (const team of game.teams) {
    const run = forwardValue(schedule, byFixtureId, team.id, gameweeks);
    runByTeam.set(team.id, { run, swing: run - pastValue(rawFixtures, team.id, horizon) });
  }

  const owned = new Map<number, { owned: number; started: number; eo: number; mine: boolean }>();
  if (league) {
    for (const manager of league.managers) {
      for (const pick of [...manager.starters, ...manager.bench]) {
        const id = pick.entry.player.id;
        const row = owned.get(id) ?? { owned: 0, started: 0, eo: 0, mine: false };
        row.owned += 1;
        if (pick.isStarter) row.started += pick.isCaptain ? 2 : 1;
        if (manager.isMe) row.mine = true;
        owned.set(id, row);
      }
    }
    for (const row of owned.values()) {
      row.eo = league.size > 0 ? row.started / league.size : 0;
    }
  }

  const players: ScoutPlayer[] = pool.players.map((entry) => {
    const { player } = entry;
    const run = runByTeam.get(player.teamId) ?? { run: 0, swing: 0 };
    const league = owned.get(player.id);

    return {
      id: player.id,
      name: player.name,
      teamId: player.teamId,
      teamShort: teamsById.get(player.teamId)?.shortName ?? "—",
      position: player.position,
      price: player.price,
      priceChangeEvent: player.priceChangeEvent,
      availability: player.availability,

      totalPoints: player.totalPoints,
      pointsPerMillion: player.pointsPerMillion,
      pointsPer90: pointsPer90(player.totalPoints, player.minutes),
      form: player.form,
      minutes: player.minutes,
      minutesShare: player.minutesShare,
      selectedBy: player.selectedBy,
      xgPer90: player.per90.xg,
      xaPer90: player.per90.xa,

      isProjected: entry.isProjected,
      xpNext: entry.xpNext,
      xpHorizon: entry.xpHorizon,

      fixtureRun: run.run,
      fixtureSwing: run.swing,

      leagueOwned: league?.owned ?? 0,
      leagueStarted: league?.started ?? 0,
      effectiveOwnership: league?.eo ?? 0,
      ownedByMe: league?.mine ?? false,
    };
  });

  return {
    players,
    leagueSize: league?.size ?? 0,
    horizon,
    mySquad:
      league?.me === undefined || league?.me === null
        ? []
        : [...league.me.starters, ...league.me.bench].map((pick) => pick.entry.player.id),
  };
}

