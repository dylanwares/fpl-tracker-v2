/**
 * Everything the player sheet shows, in one serialisable payload.
 *
 * The sheet is opened from anywhere in the app by element id, so this is
 * deliberately self-contained: no Maps, no methods, nothing that needs the
 * caller to have already built a pool. It crosses a Server Action boundary, so
 * plain JSON is a hard requirement rather than a preference.
 */
import { config } from "@/lib/config";
import type { Rag } from "@/components/ui/rag";
import type { Difficulty } from "@/components/ui/fixture-cell";
import { resolveGameweekState, horizonEvents } from "@/lib/fpl/gameweek";
import { difficultyFor, DIFFICULTY_SOURCE } from "./difficulty";
import { buildSchedule } from "./fixtures";
import { getAllFixtures, getGameData } from "./game";
import { getPlayerPool } from "./pool";
import { buildTeamForm } from "./form";
import { buildRagScorer, type PlayerRating } from "./rag";
import { MAX_HORIZON, type TickerRow } from "./ticker";

export interface DetailFixture {
  gameweek: number;
  /** Empty on a blank gameweek; two entries on a double. */
  matches: {
    opponent: string;
    opponentName: string;
    isHome: boolean;
    difficulty: Difficulty;
  }[];
  /** Projected points for the gameweek, or null when unprojected. */
  xp: number | null;
  xpRag: Rag;
}

export interface PlayerDetail {
  id: number;
  name: string;
  fullName: string;
  position: string;
  teamShort: string;
  teamName: string;
  teamCode: number | null;
  price: number;
  priceChangeEvent: number;
  selectedBy: number;
  availability: "available" | "doubtful" | "out";
  news: string;
  chanceOfPlaying: number | null;

  totalPoints: number;
  pointsPerGame: number;
  form: number;
  pointsPerMillion: number;
  minutes: number;
  minutesShare: number;
  starts: number;
  goals: number;
  assists: number;
  cleanSheets: number;
  bonus: number;
  defensiveContribution: number;
  per90: { xg: number; xa: number; xgi: number; xgc: number; defcon: number; saves: number };

  isProjected: boolean;
  xpNext: number | null;
  xpHorizon: number | null;
  fixtures: DetailFixture[];
  rating: PlayerRating;
  difficultySource: string;
}

export async function getPlayerDetail(
  elementId: number,
  horizon = config.defaultHorizon,
): Promise<PlayerDetail | null> {
  const [game, pool, rawFixtures] = await Promise.all([
    getGameData(),
    getPlayerPool(horizon),
    getAllFixtures(),
  ]);

  const entry = pool.players.find((candidate) => candidate.player.id === elementId);
  if (!entry) return null;

  const { player, team } = entry;
  const scorer = buildRagScorer(pool);
  const schedule = buildSchedule(rawFixtures);
  const byFixtureId = new Map(rawFixtures.map((fixture) => [fixture.id, fixture]));
  const teamsById = new Map(game.teams.map((row) => [row.id, row]));

  const state = resolveGameweekState(game.events);
  const from = state.next?.id ?? state.current?.id ?? 1;
  const gameweeks = horizonEvents(game.events, from, horizon);
  const byGameweek = schedule.get(player.teamId);

  const fixtures: DetailFixture[] = gameweeks.map((gameweek) => {
    const scheduled = byGameweek?.get(gameweek) ?? [];
    const xp = entry.projection?.byGameweek.get(gameweek)?.points ?? null;

    return {
      gameweek,
      matches: scheduled.map((fixture) => {
        const raw = byFixtureId.get(fixture.fixtureId);
        const opponent = teamsById.get(fixture.opponentId);
        return {
          opponent: opponent?.shortName ?? "???",
          opponentName: opponent?.name ?? "Unknown",
          isHome: fixture.isHome,
          difficulty: raw ? difficultyFor(fixture, raw) : (3 as Difficulty),
        };
      }),
      xp,
      xpRag: scorer.rateGameweek(player.position, xp),
    };
  });

  return {
    id: player.id,
    name: player.name,
    fullName: player.fullName,
    position: player.position,
    teamShort: team?.shortName ?? "—",
    teamName: team?.name ?? "Unknown",
    teamCode: team?.code ?? null,
    price: player.price,
    priceChangeEvent: player.priceChangeEvent,
    selectedBy: player.selectedBy,
    availability: player.availability,
    news: player.news,
    chanceOfPlaying: player.chanceOfPlaying,

    totalPoints: player.totalPoints,
    pointsPerGame: player.pointsPerGame,
    form: player.form,
    pointsPerMillion: player.pointsPerMillion,
    minutes: player.minutes,
    minutesShare: player.minutesShare,
    starts: player.starts,
    goals: player.goals,
    assists: player.assists,
    cleanSheets: player.cleanSheets,
    bonus: player.bonus,
    defensiveContribution: player.defensiveContribution,
    per90: player.per90,

    isProjected: entry.isProjected,
    xpNext: entry.xpNext,
    xpHorizon: entry.xpHorizon,
    fixtures,
    rating: scorer.rate(entry),
    difficultySource: DIFFICULTY_SOURCE,
  };
}

/**
 * Ticker rows for every team over the next `MAX_HORIZON` gameweeks, plus their
 * form. Built once on the server; the client slices and re-sorts it without
 * refetching, so changing the horizon is instant.
 */
export async function getTickerData(): Promise<{
  rows: TickerRow[];
  gameweeks: number[];
  difficultySource: string;
}> {
  const [game, rawFixtures] = await Promise.all([getGameData(), getAllFixtures()]);

  const schedule = buildSchedule(rawFixtures);
  const byFixtureId = new Map(rawFixtures.map((fixture) => [fixture.id, fixture]));
  const teamsById = new Map(game.teams.map((team) => [team.id, team]));

  const state = resolveGameweekState(game.events);
  const from = state.next?.id ?? state.current?.id ?? 1;
  const gameweeks = horizonEvents(game.events, from, MAX_HORIZON);
  const form = buildTeamForm(game.teams, rawFixtures, game.players);
  const formByTeam = new Map(form.map((entry) => [entry.teamId, entry]));

  const rows: TickerRow[] = game.teams.map((team) => {
    const byGameweek = schedule.get(team.id);

    return {
      team,
      cells: gameweeks.map((gameweek) => ({
        gameweek,
        matches: (byGameweek?.get(gameweek) ?? []).map((fixture) => {
          const raw = byFixtureId.get(fixture.fixtureId);
          const opponent = teamsById.get(fixture.opponentId);
          return {
            opponent: opponent?.shortName ?? "???",
            opponentName: opponent?.name ?? "Unknown",
            isHome: fixture.isHome,
            difficulty: raw ? difficultyFor(fixture, raw) : (3 as Difficulty),
          };
        }),
      })),
      form: formByTeam.get(team.id)!,
    };
  });

  return { rows, gameweeks, difficultySource: DIFFICULTY_SOURCE };
}
