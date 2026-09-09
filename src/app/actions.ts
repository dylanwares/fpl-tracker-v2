"use server";

import { updateTag } from "next/cache";
import { FplTag } from "@/lib/fpl";
import { getPlayerDetail, type PlayerDetail } from "@/lib/model/detail";
import { XP_TAG } from "@/lib/xp/client";

/**
 * Drop every cached response — FPL data and expected-points projections — so
 * the next render refetches. `updateTag` (rather than `revalidateTag`) so the
 * refresh button shows fresh data immediately instead of serving stale content
 * while it reloads.
 */
export async function refreshFplData() {
  for (const tag of [...Object.values(FplTag), XP_TAG]) {
    updateTag(tag);
  }
}

/**
 * Everything the player sheet needs, by element id.
 *
 * Fetched on open rather than passed down as props from every row: My Team has
 * 15 players, but Scout will render the whole pool, and serialising 600 player
 * payloads into the page to support a sheet that shows one of them is the wrong
 * trade. The underlying model is cached, so this is a fast round trip.
 */
export async function loadPlayerDetail(elementId: number): Promise<PlayerDetail | null> {
  return getPlayerDetail(elementId);
}
