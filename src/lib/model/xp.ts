/**
 * The expected-points engine, behind one interface.
 *
 * Everything in the app that needs xP reads it from here — no page imports the
 * provider client directly, so the source can change without touching the UI.
 *
 * **The feed's number is the number.** We do not blend it, weight it, adjust it
 * for fixtures or form, or fall back to the FPL API's `ep_next`. The provider's
 * model is the model; this layer only reshapes the payload into a lookup.
 *
 * Players absent from the feed return `null`, never `0`. Roughly 28 of the 653
 * FPL players are missing at any time (mostly fringe squad members, but not
 * always), and a zero would quietly rank a real player last.
 */
import { cacheLife, cacheTag } from "next/cache";
import { fetchProjections, XP_TAG } from "@/lib/xp/client";
import type { XpApiPlayer } from "@/lib/xp/types";

export type Position = "GKP" | "DEF" | "MID" | "FWD";

export interface GameweekProjection {
  gameweek: number;
  points: number;
  minutes: number;
}

export interface PlayerProjection {
  /** FPL element id — the join key against `bootstrap-static`. */
  elementId: number;
  /** FPL element code, stable across seasons. */
  code: number;
  name: string;
  team: string;
  position: Position;
  /** Already in millions, e.g. 15.5. */
  price: number;
  selectedBy: number;
  /**
   * The provider's own total across the requested window. Prefer this to
   * summing gameweeks yourself — request the window you want and read it off.
   */
  windowPoints: number;
  byGameweek: Map<number, GameweekProjection>;
  rates: {
    xgPer90: number | null;
    xaPer90: number | null;
    defconPer90: number | null;
    savesPer90: number | null;
    /** Defensive-contribution rate is last season's, so read it with caution. */
    defconIsLastSeason: boolean;
  };
}

export interface Projections {
  /** Gameweeks covered, ascending. */
  gameweeks: number[];
  byElementId: Map<number, PlayerProjection>;
  fetchedAt: Date;

  /** A player's projection, or null when the feed doesn't cover them. */
  get(elementId: number): PlayerProjection | null;
  /** Points for one gameweek, or null when unprojected. */
  pointsFor(elementId: number, gameweek: number): number | null;
  /** The provider's window total, or null when unprojected. */
  totalFor(elementId: number): number | null;
  /**
   * Points totalled over a subset of the window — only for when a page needs a
   * shorter horizon than the one fetched. Straight addition of the provider's
   * numbers, nothing more.
   */
  sumOver(elementId: number, gameweeks?: number[]): number | null;
}

const positionMap: Record<string, Position> = {
  GK: "GKP",
  GKP: "GKP",
  DEF: "DEF",
  MID: "MID",
  FWD: "FWD",
};

/**
 * Pure — takes a parsed payload so it can be tested without the network.
 *
 * `fetchedAt` is a required argument rather than a `new Date()` default on
 * purpose: reading the clock during a prerender is unstable data and Next will
 * refuse to build the route. The timestamp is captured inside the cached scope
 * below, so it means "when this data was fetched" rather than "now".
 */
export function buildProjections(raw: unknown, fetchedAt: Date): Projections {
  if (!Array.isArray(raw)) {
    throw new Error("Expected-points feed did not return an array");
  }

  const byElementId = new Map<number, PlayerProjection>();
  const gameweeks = new Set<number>();

  for (const entry of raw as XpApiPlayer[]) {
    if (typeof entry?.id !== "number" || !Array.isArray(entry.gameweeks)) continue;

    const byGameweek = new Map<number, GameweekProjection>();
    for (const week of entry.gameweeks) {
      if (typeof week?.gw !== "number") continue;
      gameweeks.add(week.gw);
      // A double gameweek should arrive as one row per gameweek with both
      // matches already summed; if the provider ever splits them, add rather
      // than overwrite so the total stays right.
      const existing = byGameweek.get(week.gw);
      byGameweek.set(week.gw, {
        gameweek: week.gw,
        points: (existing?.points ?? 0) + week.points,
        minutes: (existing?.minutes ?? 0) + week.minutes,
      });
    }

    byElementId.set(entry.id, {
      elementId: entry.id,
      code: entry.fpl_code,
      name: entry.name,
      team: entry.team,
      position: positionMap[entry.position] ?? "MID",
      price: entry.price,
      selectedBy: entry.selected_by,
      windowPoints: entry.total_points,
      byGameweek,
      rates: {
        xgPer90: entry.expected_goals_per_90,
        xaPer90: entry.expected_assists_per_90,
        defconPer90: entry.defensive_contribution_per_90,
        savesPer90: entry.saves_per_90,
        defconIsLastSeason: Boolean(entry.defcon_is_last_season),
      },
    });
  }

  const orderedGameweeks = [...gameweeks].sort((a, b) => a - b);

  return {
    gameweeks: orderedGameweeks,
    byElementId,
    fetchedAt,

    get(elementId) {
      return byElementId.get(elementId) ?? null;
    },

    pointsFor(elementId, gameweek) {
      return byElementId.get(elementId)?.byGameweek.get(gameweek)?.points ?? null;
    },

    totalFor(elementId) {
      return byElementId.get(elementId)?.windowPoints ?? null;
    },

    sumOver(elementId, weeks = orderedGameweeks) {
      const player = byElementId.get(elementId);
      if (!player) return null;
      let total = 0;
      for (const week of weeks) {
        total += player.byGameweek.get(week)?.points ?? 0;
      }
      return total;
    },
  };
}

/**
 * The cached boundary. It returns the provider's raw payload rather than a
 * `Projections`, because that object carries Maps and methods and only plain
 * JSON survives a cache boundary. Hydration happens on the way out.
 */
async function fetchProjectionData(
  horizon: number,
): Promise<{ payload: unknown; fetchedAt: number }> {
  "use cache";
  cacheLife("projections");
  cacheTag(XP_TAG);

  const payload = await fetchProjections(horizon);
  // Read inside the cached scope, so it is stamped when the entry is computed
  // and stays stable for every render served from it.
  return { payload, fetchedAt: Date.now() };
}

/**
 * Projections for the next `horizon` gameweeks. Cached, so calling this from
 * several server components in one render costs one request.
 *
 * Throws if the feed is unreachable — callers that must still render without it
 * (`getPlayerPool`) catch and degrade rather than blanking the page.
 */
export async function getProjections(horizon: number): Promise<Projections> {
  const { payload, fetchedAt } = await fetchProjectionData(horizon);
  return buildProjections(payload, new Date(fetchedAt));
}

