/**
 * Types for the FPL Copilot expected-points API.
 *
 *   GET https://api.fplcopilot.com/api/expected-points?window={n}
 *
 * Verified against the live endpoint on 2026-09-09 (season 2026/27, GW4 next).
 * This is a third-party, undocumented API — treat the shape as observed rather
 * than guaranteed, and keep everything behind `src/lib/model/xp.ts` so it can be
 * replaced without touching a page.
 */

/** One projected gameweek for one player. */
export interface XpApiGameweek {
  gw: number;
  /** Projected minutes, e.g. 88.0. */
  minutes: number;
  /** Projected points for that gameweek. */
  points: number;
  /**
   * Pre-adjustment values. Identical to `points`/`minutes` in every row of the
   * snapshots we've inspected — read `points`/`minutes` and treat these as
   * informational until we see them diverge.
   */
  base_minutes: number;
  base_points: number;
}

export interface XpApiPriceProjection {
  offset: number;
  projected_percent: number;
  likelihood: number;
}

export interface XpApiPlayer {
  /** The FPL element id — verified to match `bootstrap-static` for all 626 players. */
  id: number;
  /** The FPL element `code` — stable across seasons, our fallback join key. */
  fpl_code: number;
  /** Short display name, e.g. "B.Fernandes". Not the FPL `web_name` spelling. */
  name: string;
  /** "GK" | "DEF" | "MID" | "FWD" — note "GK", where FPL uses "GKP". */
  position: string;
  /** Three-letter team code, e.g. "MCI". */
  team: string;
  /** Price in millions already divided by 10, e.g. 15.5 — unlike the FPL API. */
  price: number;
  live_price: number;
  cost_change_event: number;
  selected_by: number;
  /**
   * Sum of `points` across the requested window — NOT the player's actual
   * season points. Normalised to `windowPoints` to avoid confusion with the
   * FPL API's `total_points`.
   */
  total_points: number;
  gameweeks: XpApiGameweek[];

  price_change_percent: number;
  price_change_projections: XpApiPriceProjection[];
  price_change_locked_until: string | null;
  price_change_calibrating: boolean;

  expected_goals_per_90: number | null;
  expected_assists_per_90: number | null;
  defensive_contribution_per_90: number | null;
  /** GK only; null for outfielders. */
  saves_per_90: number | null;
  /** True when the defensive-contribution rate is drawn from last season. */
  defcon_is_last_season: boolean;
}

export type XpApiResponse = XpApiPlayer[];
