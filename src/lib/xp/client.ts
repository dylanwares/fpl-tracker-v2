/**
 * HTTP client for the FPL Copilot expected-points feed.
 *
 * Behaviour observed on the live endpoint:
 * - `window=n` returns the next `n` gameweeks starting from the upcoming one.
 *   `window=1` → [4]; `window=38` → [4..38]; omitting it returns the whole
 *   season including past gameweeks.
 * - 626 players, ~2.2MB uncompressed for the full season, gzip supported.
 * - `cache-control: private`, no ETag — the TTL is ours to choose.
 *
 * It is an unofficial third-party service with no published rate limits, so we
 * fetch once per window per TTL and never per component.
 */

const XP_BASE_URL = "https://api.fplcopilot.com/api";

export const XP_TAG = "xp:projections";

/** Longest horizon the endpoint accepts. */
export const MAX_WINDOW = 38;

/**
 * Projections are recomputed by the provider as team news lands, so a shorter
 * lifetime than the FPL data itself. Applied by the caller via `cacheLife`
 * (see `src/lib/model/xp.ts`) — this module does no caching of its own.
 */
export const XP_CACHE_PROFILE = "hours" as const;

export class XpApiError extends Error {
  constructor(
    readonly status: number,
    message?: string,
  ) {
    super(message ?? `Expected-points API returned ${status}`);
    this.name = "XpApiError";
  }
}

/**
 * Fetch raw projections for the next `window` gameweeks.
 * Pass `null` for the full season, including past gameweeks — unused by the app,
 * since past projections are the provider's current view rather than what it
 * published at the time.
 */
export async function fetchProjections(window: number | null): Promise<unknown> {
  const query = window === null ? "" : `?window=${clampWindow(window)}`;

  const response = await fetch(`${XP_BASE_URL}/expected-points${query}`, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new XpApiError(response.status);
  }

  return response.json();
}

export function clampWindow(window: number): number {
  return Math.min(MAX_WINDOW, Math.max(1, Math.trunc(window)));
}
