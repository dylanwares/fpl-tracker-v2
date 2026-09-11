@AGENTS.md

# FPL Tracker

Personal FPL planning tool. Read `docs/fpl-app-spec.md` (product) and
`docs/fpl-app-design-spec.md` (design) before changing behaviour or visuals;
`docs/roadmap.md` tracks which stage we're on.

## Ground rules

- **Build in stages.** Each stage is reviewed on screen before the next starts.
  Don't implement pages ahead of the roadmap.
- **No fake data.** A page either shows real numbers or renders `NotBuiltYet`.
- **Design tokens live in `src/app/globals.css`** and are mapped into Tailwind
  with `@theme inline`. No hex values in components.
- **All FPL calls go through `src/lib/fpl/api.ts`** — server-side only, since
  the API sends no CORS headers. That layer does **no caching**: under Cache
  Components the cached unit is the trimmed model in `src/lib/model/`, which is
  how we stay under the 2MB fetch-cache ceiling that `bootstrap-static` breaks.
- **Pages read `src/lib/model/`, never `src/lib/fpl/` directly.** `getGameData`,
  `getPlayerPool`, `getAllFixtures` are cached with `use cache` + `cacheLife` +
  `cacheTag`. Anything uncached must sit inside `<Suspense>` or the route will
  not prerender. Never read the clock in a prerender — capture timestamps inside
  the cached scope.
- **All expected-points access goes through `src/lib/model/xp.ts`.** xP is
  sourced from the FPL Copilot API (`src/lib/xp/`), not modelled here. No page
  imports the provider client directly, so the source stays swappable.
- **Unprojected players are `null`, never `0`.** ~28 of the 654 FPL players are
  missing from the xP feed; a zero would silently rank a real player last. They
  stay in the pool with `isProjected: false` and sort last in either direction
  (`byExpectedPoints`) — never filtered out.
- **If the xP feed is down there is no fallback.** `getPlayerPool` returns
  `projectionsAvailable: false`; show `WarningBanner` and leave xP blank. No
  second provider, no `ep_next`, no database.
- **The feed's xP number is used as published.** No blending, weighting,
  smoothing or recalculation, and no fallback to FPL's `ep_next` (deliberately
  not typed in `src/lib/fpl/types.ts`). Totalling gameweeks is the only
  arithmetic allowed, and `windowPoints` avoids even that.
- **Keep pure model logic out of server-loading modules.** A client component
  importing a runtime value from a module that also imports `next/cache` or a
  `use cache` function pulls server code into the browser bundle and fails the
  build. `model/scout.ts` (pure) vs `model/scout-data.ts` (loader) is the
  pattern.
- **Player detail is one component.** `PlayerTrigger` + the sheet mounted in
  the app shell (design spec §6.10). Never build a second player detail view,
  and pass an element id rather than a serialised player.
- **Rating a result is not rating a forecast.** `rateGameweek` scores xP against
  every projected player in the position; `rateReturn` scores points actually
  scored against regular starters only. Swapping them rates a two-point blank
  green. Per-match history comes from `model/element.ts`
  (`element-summary/{id}/`, fetched on sheet open, never for the whole pool),
  and the strip shaping is pure in `model/form-strip.ts`.
- **Fixture difficulty goes through `src/lib/model/difficulty.ts`.** It returns
  FPL's static official FDR today; Stage 5 replaces the body with our own team
  ratings and nothing else changes.
- **Navigation must feel native** (design spec §8): tab state is optimistic,
  every route is prefetched and has a `loading.tsx`, and there is no transition
  animation between tabs.
- **Gameweek `points` from `entry/{id}/history/` are gross of transfer hits**;
  the standings are net. Compare on net (`points − event_transfers_cost`) or the
  League and Analysis pages will disagree.
- Prices are tenths of a million. `form`, `ep_next`, `expected_goals` etc. come
  back as strings — parse once at the model layer with `num()`.
- The xP feed is an unofficial third party with no published rate limits: fetch
  once per window per TTL, never per component.
