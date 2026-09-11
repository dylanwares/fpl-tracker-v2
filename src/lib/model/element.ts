/**
 * A single player's match-by-match record, trimmed and cached.
 *
 * `element-summary/{id}/` is the only endpoint that carries per-match returns
 * for one player — `bootstrap-static` has season totals and nothing else. It is
 * small (one row per match played), so unlike the bootstrap the whole response
 * would fit in the fetch cache; we still cache the trimmed model instead, to
 * keep one rule about where caching happens rather than two.
 *
 * Fetched on demand when the player sheet opens, not for the whole pool: 650
 * calls to build a page that shows one player is the wrong trade.
 */
import { cacheLife, cacheTag } from "next/cache";
import { getElementSummary } from "@/lib/fpl/api";
import { FplApiError, FplTag } from "@/lib/fpl/client";
import { num } from "@/lib/utils";

export interface ElementMatch {
  gameweek: number;
  fixtureId: number;
  opponentId: number;
  isHome: boolean;
  minutes: number;
  points: number;
  goals: number;
  assists: number;
  bonus: number;
  xg: number;
  xa: number;
  saves: number;
}

/**
 * Every match this player has featured in, ascending. Empty when the player has
 * no record yet — a new signing, or the opening gameweek.
 *
 * A 404 comes back as an empty list rather than an error: a missing summary
 * should cost the sheet its form strip, not the whole panel.
 */
export async function getElementHistory(elementId: number): Promise<ElementMatch[]> {
  "use cache";
  cacheLife("fplData");
  cacheTag(FplTag.element);

  let summary;
  try {
    summary = await getElementSummary(elementId);
  } catch (error) {
    if (error instanceof FplApiError && error.status === 404) return [];
    throw error;
  }

  return summary.history.map((row) => ({
    gameweek: row.round,
    fixtureId: row.fixture,
    opponentId: row.opponent_team,
    isHome: row.was_home,
    minutes: row.minutes,
    points: row.total_points,
    goals: row.goals_scored,
    assists: row.assists,
    bonus: row.bonus,
    xg: num(row.expected_goals),
    xa: num(row.expected_assists),
    saves: row.saves,
  }));
}
