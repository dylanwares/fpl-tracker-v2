/**
 * Thin HTTP client for the public FPL API.
 *
 * Server-side only — the FPL API sends no CORS headers, so browser fetches fail.
 * Every call goes through here so there is exactly one place that knows about
 * URLs, headers and error shapes.
 *
 * **Caching is not done here.** Under Cache Components the caller decides, by
 * wrapping the call in a `use cache` function with a `cacheLife` and a
 * `cacheTag` (see `src/lib/model/`). That matters for `bootstrap-static`, whose
 * 2.3MB payload exceeds the fetch data cache's 2MB ceiling: we cache the
 * trimmed model instead of the response.
 */

const BASE_URL = "https://fantasy.premierleague.com/api";

/** Cache tags, so a manual refresh can invalidate a slice of the data. */
export const FplTag = {
  bootstrap: "fpl:bootstrap",
  fixtures: "fpl:fixtures",
  entry: "fpl:entry",
  league: "fpl:league",
  element: "fpl:element",
  live: "fpl:live",
} as const;

export type FplTagName = (typeof FplTag)[keyof typeof FplTag];

export class FplApiError extends Error {
  constructor(
    readonly path: string,
    readonly status: number,
    message?: string,
  ) {
    super(message ?? `FPL API ${status} for ${path}`);
    this.name = "FplApiError";
  }
}

export async function fplFetch<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: {
      // The API 403s some default agents; a browser-ish UA keeps it happy.
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new FplApiError(path, response.status);
  }

  return (await response.json()) as T;
}
