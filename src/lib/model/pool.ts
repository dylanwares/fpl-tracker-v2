/**
 * The player pool — normalised players joined to their projections.
 *
 * This is what pages read. It is the only place the two sources meet, and it
 * enforces the two rules that matter:
 *
 * 1. **Unprojected is `null`, never `0`.** Roughly 28 of the 653 FPL players
 *    are missing from the feed at any time, some with real minutes. A zero
 *    would quietly rank a playing footballer below every bench warmer, so the
 *    absence is carried as `isProjected: false` all the way to the cell that
 *    renders it.
 * 2. **A dead feed does not blank the page.** If the provider is unreachable we
 *    return the pool with every projection null and `projectionsAvailable`
 *    false; the caller shows a warning and every non-xP number still works.
 *    There is no fallback source — see product spec §7.4.
 */
import { config } from "@/lib/config";
import { resolveGameweekState } from "@/lib/fpl/gameweek";
import { getGameData } from "./game";
import type { Player } from "./players";
import type { Team } from "./teams";
import { teamsById } from "./teams";
import { getProjections, type PlayerProjection } from "./xp";

export interface PooledPlayer {
  player: Player;
  team: Team | null;
  /** The feed's row for this player, or null when it doesn't cover him. */
  projection: PlayerProjection | null;
  isProjected: boolean;
  /** Projected points for the next gameweek, or null. */
  xpNext: number | null;
  /** The provider's own total across the requested window, or null. */
  xpHorizon: number | null;
}

export interface PlayerPool {
  players: PooledPlayer[];
  /** Gameweeks the projections cover, ascending. Empty if the feed is down. */
  gameweeks: number[];
  /** The gameweek being planned for. */
  planningGameweek: number | null;
  /** False when the xP feed could not be reached — show the warning banner. */
  projectionsAvailable: boolean;
  /** How many players the feed doesn't cover. Worth surfacing; it moves. */
  unprojectedCount: number;
}

export async function getPlayerPool(horizon = config.defaultHorizon): Promise<PlayerPool> {
  const game = await getGameData();

  let projections = null;
  try {
    projections = await getProjections(horizon);
  } catch (error) {
    // Deliberately swallowed: the pool is still useful without xP.
    console.error("[pool] expected-points feed unavailable", error);
  }

  const teams = teamsById(game.teams);
  const state = resolveGameweekState(game.events);
  const nextGameweek = state.next?.id ?? state.current?.id ?? null;
  const gameweeks = projections?.gameweeks ?? [];

  let unprojectedCount = 0;
  const players = game.players.map((player) => {
    const projection = projections?.get(player.id) ?? null;
    if (projection === null) unprojectedCount += 1;

    return {
      player,
      team: teams.get(player.teamId) ?? null,
      projection,
      isProjected: projection !== null,
      xpNext:
        nextGameweek === null ? null : (projections?.pointsFor(player.id, nextGameweek) ?? null),
      xpHorizon: projections?.totalFor(player.id) ?? null,
    } satisfies PooledPlayer;
  });

  return {
    players,
    gameweeks,
    planningGameweek: nextGameweek,
    projectionsAvailable: projections !== null,
    unprojectedCount: projections === null ? 0 : unprojectedCount,
  };
}

export function pooledById(pool: PlayerPool): Map<number, PooledPlayer> {
  return new Map(pool.players.map((entry) => [entry.player.id, entry]));
}

/**
 * Sort helper for xP columns: unprojected players sort last whichever way the
 * column is pointed, rather than being filtered out (settled Stage 2 — you
 * want to see that a new signing has no projection yet).
 */
export function byExpectedPoints(
  key: "xpNext" | "xpHorizon" = "xpHorizon",
  direction: "desc" | "asc" = "desc",
) {
  return (a: PooledPlayer, b: PooledPlayer): number => {
    const left = a[key];
    const right = b[key];
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return direction === "desc" ? right - left : left - right;
  };
}

/** Players with enough minutes to sit in a RAG peer group (product spec §2.2). */
export function meetsMinutesThreshold(entry: PooledPlayer): boolean {
  return entry.player.minutesShare >= config.minutesThreshold;
}
