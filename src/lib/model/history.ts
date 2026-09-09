/**
 * Actual points per player per gameweek — the spine of the Analysis page.
 *
 * `event/{gw}/live/` is ~464KB and we need one number per player from it, so
 * the fetch stays uncached and the trimmed map (6.4KB) is what gets cached.
 * Same reasoning as `bootstrap-static` in `game.ts`.
 *
 * A finished gameweek is immutable — once `data_checked` is true its points
 * never change — so settled gameweeks get the long `settled` profile and are
 * fetched once for the season. A gameweek still in progress gets the short one.
 */
import { cacheLife, cacheTag } from "next/cache";
import { getEventLive } from "@/lib/fpl/api";
import { FplTag } from "@/lib/fpl/client";

/** element id → points scored in that gameweek. */
export type LivePoints = Record<number, number>;

export async function getLivePoints(event: number, settled: boolean): Promise<LivePoints> {
  "use cache";
  // Branching is supported as long as exactly one call runs per invocation;
  // a computed profile name isn't, so these are written out.
  if (settled) cacheLife("settled");
  else cacheLife("fplData");
  cacheTag(FplTag.live);

  const live = await getEventLive(event);
  const points: LivePoints = {};
  for (const element of live.elements) {
    points[element.id] = element.stats.total_points;
  }
  return points;
}
