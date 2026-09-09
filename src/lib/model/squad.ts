/**
 * My squad for a gameweek, joined to the player pool.
 *
 * **The upcoming squad is not public.** `entry/{id}/event/{gw}/picks/` 404s for
 * a gameweek that hasn't kicked off — verified against GW4 while GW3 was
 * current. Reading your own unconfirmed team needs an authenticated
 * `my-team/{id}/` call, which this app deliberately doesn't make (product spec
 * §9: no login).
 *
 * So My Team shows the last confirmed squad, and rates it against the xP for
 * the gameweek ahead. That is the right way round for planning — you are asking
 * "who should change before the deadline", not "how did I do".
 */
import { cacheLife, cacheTag } from "next/cache";
import { config, requireEntryId } from "@/lib/config";
import { getEntry, getEntryPicks } from "@/lib/fpl/api";
import { FplApiError, FplTag } from "@/lib/fpl/client";
import { resolveGameweekState } from "@/lib/fpl/gameweek";
import type { FplEntryPicks } from "@/lib/fpl/types";
import { getGameData } from "./game";
import { getPlayerPool, pooledById, type PlayerPool, type PooledPlayer } from "./pool";

export interface SquadPick {
  entry: PooledPlayer;
  /** 1–11 are the starting XI in position order, 12–15 the bench in sub order. */
  position: number;
  isStarter: boolean;
  isCaptain: boolean;
  isViceCaptain: boolean;
  /** 0 benched, 1 playing, 2 captain, 3 triple captain. */
  multiplier: number;
}

export interface Squad {
  /** The gameweek these picks are confirmed for. */
  gameweek: number;
  /** The gameweek we are planning for — usually `gameweek + 1`. */
  planningGameweek: number | null;
  /** True when the picks shown are for the gameweek being planned. Rare: it
   *  only happens once a deadline has passed and results aren't in. */
  isCurrent: boolean;
  activeChip: string | null;
  starters: SquadPick[];
  bench: SquadPick[];
  managerName: string;
  teamName: string;
  overallRank: number | null;
  totalPoints: number;
  pool: PlayerPool;
}

/** Human labels for FPL's chip codes. */
const chipNames: Record<string, string> = {
  "3xc": "Triple Captain",
  bboost: "Bench Boost",
  freehit: "Free Hit",
  wildcard: "Wildcard",
  manager: "Assistant Manager",
};

export function chipLabel(chip: string | null): string | null {
  if (!chip) return null;
  return chipNames[chip] ?? chip;
}

/**
 * Walk back from the current gameweek until picks exist. One step is normally
 * enough; the loop covers the first week of a season, when nothing is public.
 */
export async function fetchLatestPicks(
  entryId: number,
  from: number,
): Promise<{ picks: FplEntryPicks; gameweek: number } | null> {
  for (let gameweek = from; gameweek >= Math.max(1, from - 2); gameweek -= 1) {
    try {
      return { picks: await getEntryPicks(entryId, gameweek), gameweek };
    } catch (error) {
      if (error instanceof FplApiError && error.status === 404) continue;
      throw error;
    }
  }
  return null;
}

export async function getSquad(horizon = config.defaultHorizon): Promise<Squad | null> {
  "use cache";
  cacheLife("fplData");
  cacheTag(FplTag.entry);

  const entryId = requireEntryId();
  const [game, pool] = await Promise.all([getGameData(), getPlayerPool(horizon)]);
  const state = resolveGameweekState(game.events);

  const from = state.current?.id ?? state.previous?.id ?? 1;
  const result = await fetchLatestPicks(entryId, from);
  if (result === null) return null;

  const entry = await getEntry(entryId);
  const byId = pooledById(pool);

  const picks: SquadPick[] = result.picks.picks
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

  return {
    gameweek: result.gameweek,
    planningGameweek: pool.planningGameweek,
    isCurrent: result.gameweek === pool.planningGameweek,
    activeChip: result.picks.active_chip,
    starters: picks.filter((pick) => pick.isStarter),
    bench: picks.filter((pick) => !pick.isStarter),
    managerName: `${entry.player_first_name} ${entry.player_last_name}`.trim(),
    teamName: entry.name,
    overallRank: entry.summary_overall_rank,
    totalPoints: entry.summary_overall_points,
    pool,
  };
}

/** The starting XI split into pitch rows, in formation order. */
export function formationRows(starters: SquadPick[]): SquadPick[][] {
  const order = ["GKP", "DEF", "MID", "FWD"] as const;
  return order.map((position) =>
    starters.filter((pick) => pick.entry.player.position === position),
  );
}

/** "3-4-3" — read off the actual picks rather than assumed. */
export function formationLabel(starters: SquadPick[]): string {
  const [, defenders, midfielders, forwards] = formationRows(starters);
  return [defenders.length, midfielders.length, forwards.length].join("-");
}
