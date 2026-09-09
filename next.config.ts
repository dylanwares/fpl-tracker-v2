import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Cache Components (Next 16). Two reasons we're on it:
   *
   * 1. `bootstrap-static` is 2.3MB, over the 2MB ceiling on the fetch data
   *    cache, so the raw payload can never be cached. `use cache` lets us cache
   *    the *trimmed* model instead — a few hundred KB — in `src/lib/model/`.
   * 2. It makes Partial Prerendering the default: a static shell ships
   *    immediately and personalised data streams in. That is exactly the
   *    navigation behaviour design spec §8 asks for, and it brings React
   *    `<Activity>`, which preserves each tab's state across navigation.
   *
   * Consequence: data fetching is dynamic by default. Anything uncached must
   * sit inside a `<Suspense>` boundary or the build fails the route.
   */
  cacheComponents: true,

  /**
   * Official Premier League shirt and badge artwork, so the pitch view reads
   * like the FPL app rather than like a spreadsheet. Both are public CDNs that
   * FPL's own site serves from; nothing is copied into the repo.
   */
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "fantasy.premierleague.com", pathname: "/dist/img/**" },
      { protocol: "https", hostname: "resources.premierleague.com", pathname: "/premierleague/**" },
    ],
  },

  /**
   * Domain-named cache profiles, so `cacheLife("fplData")` reads as intent
   * rather than as a number. `stale` is how long the client router reuses a
   * cached page without asking the server — it is what makes tab switches
   * instant (design spec §8.3).
   */
  cacheLife: {
    /** Players, teams, prices, points. Moves on price changes and match days. */
    fplData: {
      stale: 60 * 5,
      revalidate: 60 * 15,
      expire: 60 * 60 * 24,
    },
    /** The xP feed. The provider recomputes as team news lands. */
    projections: {
      stale: 60 * 5,
      revalidate: 60 * 60,
      expire: 60 * 60 * 24,
    },
    /**
     * Finished gameweeks. Once `data_checked` is true a gameweek's picks,
     * points and auto-subs never change again, so this is as close to
     * immutable as the app gets.
     */
    settled: {
      stale: 60 * 60,
      revalidate: 60 * 60 * 24 * 30,
      expire: 60 * 60 * 24 * 365,
    },
  },
};

export default nextConfig;
