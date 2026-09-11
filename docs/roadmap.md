# FPL Tracker — Build Roadmap

Companion to `fpl-app-spec.md` (product) and `fpl-app-design-spec.md` (design).
Stages are ordered so each one is reviewable on screen before the next starts.

**Rule of thumb:** nothing renders fake data. A page either shows real numbers or
says it isn't built yet.

---

## Stage 0 — Project setup ✅ done

Next.js 16 (App Router, TypeScript), Tailwind v4, design tokens, app shell with
five routes, typed FPL API client, vitest. Plus the native-app layer (design
spec §8): installable manifest, safe areas, optimistic tab state, prefetched
routes, per-route loading skeletons, per-tab scroll memory.

**Review:** `npm run dev` → all five tabs navigate, My Team shows the setup card
with live gameweek data.

---

## Stage 1 — xP integration ✅ done

Expected points come from the FPL Copilot API rather than a model of our own
(product spec §7). This was Stage 3 and the riskiest part of the build; it is now
an integration, and the pages that need xP are no longer blocked behind it.

- `src/lib/xp/` — typed client for `api.fplcopilot.com/api/expected-points`
- `src/lib/model/xp.ts` — the one interface every page reads xP from
- Unprojected players return `null`, never `0` (~28 of 653 are missing)

**Review:** My Team's setup card shows the feed status — player count and the
gameweek window covered.

---

## Stage 2 — Data layer ✅ done

Raw API payloads turned into models the rest of the app can trust. No new pages:
four of the five tabs still say `NotBuiltYet`. What came out of it is what every
later stage reads from.

1. **Normalisation** — `src/lib/model/teams.ts` and `players.ts`. Numeric
   strings parsed once, price in £m, minutes share, per-90 rates, and a single
   availability verdict from `status` + `chance_of_playing_next_round` (FPL
   leaves `status` at "a" for players it has already flagged at 75%).
2. **Caching, rebuilt on Cache Components** (`cacheComponents: true`). The
   cached unit is now the *trimmed model* in `model/game.ts`, not the 2.32MB
   `bootstrap-static` response that Next refused to cache. Lifetimes are named
   for the domain — `fplData`, `projections`, `settled` — in `next.config.ts`.
3. **Join to projections** — `model/pool.ts`. Every player carries
   `projection: PlayerProjection | null` and an `isProjected` flag, and the xP
   feed being down degrades to a banner rather than an empty page.
4. **Fixture model** — `model/fixtures.ts`, per team and gameweek, where a
   blank is an empty array and a double has two entries.

**Review:** `/debug` — an unlisted route showing the pool, the top projected
players, the unprojected-but-playing list, and the fixture grid, all live. It
gets deleted at Stage 9.

**Decisions settled here** (recorded in product spec §7.4 and §11):

- Unprojected players stay in the pool, flagged, sorted last. Never hidden.
- No fallback if the xP feed dies, and **no database**. A snapshot store was
  considered and dropped: past picks, chips, auto-subs and transfers are all
  permanently readable from the FPL API, so squad history is not perishable.
  The one casualty is the "versus highest-xP pick" captaincy baseline in Stage
  8, which needs the projection as it stood before a deadline — the feed
  re-projects the past, so that number can't be recovered later.

**Not exercised by live data yet:** the fixture list currently has no blanks,
no doubles and no postponed matches, so those paths are covered by tests only
until the cups start moving fixtures.

## Stage 3 — (removed)

Was "feed validation" — measuring the feed's error against `ep_next` and
calibrating. Dropped: the projection is used exactly as published (spec §7.4),
so there is nothing to calibrate and no second source to weigh it against.
Numbering left alone so earlier notes still line up.

---

## Stage 4 — My Team ✅ done

Product spec §2. Exercises most of the data layer.

1. Squad from `entry/{id}/event/{gw}/picks/`, joined to the pool.
2. The three metrics: points vs. positional average, points per £m, and xP —
   next gameweek and over the horizon.
3. RAG by tercile within a minutes-filtered positional peer group, plus the
   overall rule and the "insufficient data" state.
4. **Pitch view** (design spec §6.9) — formation rows, bench strip, official
   shirts, overall-RAG bar and availability dot on each chip. Toggles to the
   list view, where each row expands to the underlying numbers.

**The constraint that shaped this page:** `entry/{id}/event/{gw}/picks/` returns
404 for a gameweek that hasn't kicked off — verified against GW4 while GW3 was
current. Reading your own unconfirmed team needs an authenticated `my-team/`
call, and the app does not log in (product spec §9). So My Team shows the last
confirmed squad rated against the xP for the gameweek ahead, and says so. That
is the right way round for planning: the question is "what should change before
the deadline", not "how did I do".

**Decisions settled here:**

- **Club badges: official assets.** Both the badge and shirt CDNs are public and
  keyed by team code. Colour chips were the fallback and aren't needed.
- **RAG peer group: whole position, not price-bracketed.** Price is already the
  entire content of metric B, so bracketing would apply it twice and hide the
  structural penalty on premiums that §2.2 deliberately wants visible.
- **Flat peer groups are unrated, not green.** Found by a test: when every peer
  has the same value, all of them clear the top boundary. A group with no spread
  now returns no rating rather than a page of misleading green.

**Added after review:** the universal player sheet (design spec §6.10) — tap any
player anywhere for fixtures with difficulty, per-gameweek xP RAG'd against his
position, ownership, form and underlying per-90s. It is mounted in the shell and
loads by element id, so every later stage gets it for free.

**Still to tune, once you've looked at it:** whether tercile boundaries feel
right for your squad, and whether the 30% minutes threshold is in the right
place this early in a season.

## Stage 5 — Fixtures ✅ done

Product spec §6.

1. **Ticker grid** — 20 teams × next X gameweeks, X switchable between 3, 5 and
   8, sortable by fixture run or by either combined rating. Sticky first column
   and header. All eight gameweeks are sent once and the client re-slices, so
   changing horizon or sort never refetches.
2. **Blanks and doubles** — a blank renders the hatched cell, a double renders
   both opponents side by side.
3. **Five-game form table**, attack and defence separately sortable.
4. **Combined rating** — form and fixtures as z-scores across the 20 teams,
   weighted 0.4 form / 0.6 fixtures, with attack and defence versions.

**Scoring is fixture value, not average difficulty.** A gameweek is worth
`Σ (6 − difficulty)` across its matches, so a blank scores 0, a very easy
fixture 5, and a double counts both — two middling fixtures beat one easy one,
which is the actual choice a manager makes. Averaging difficulty would have
scored a blank as though it never existed.

**Decisions settled here:**

- **Fixture difficulty stays FPL's official FDR** for now, by your call. It has
  a real spread this season (2–5) so it is usable. `model/difficulty.ts` remains
  the seam: swapping in our own team ratings is a change to that file and
  nothing else. The §7.5 question — match data or derived from the xP feed — is
  still open, just no longer blocking.
- **Form vs. fixture weighting: 0.4 / 0.6.** Fixtures are forward-looking and
  fixed; form partially regresses. One constant in `model/ticker.ts` to tune.
- **"Next X games" is per page**, not a global setting. The ticker's horizon is
  a browsing control; My Team's is a fixed planning window.

**Known limit:** the FPL API publishes no per-match expected goals — a finished
fixture carries goals, cards, bonus and BPS and nothing expected. So form is
built from actual results, and the xG / xGC columns are season-to-date, derived
from the player table (team xG is the sum of its players' individual xG; team
xGC is the first-choice keeper's, since summing outfielders would count the same
conceded chance ten times). Verified against the live season: derived xG totals
93.9 against 85 actual goals, derived xGC 89.9 against the same 85 conceded.

## Stage 6 — League ✅ done

Product spec §3. The page the app is pointed at.

1. **Headline** — rank, points behind the manager above, points ahead of the one
   below, and places moved. Largest thing on the page, per §3.1.
2. **Standings** with rank movement, active chip, and **chips remaining**. Each
   row opens to that manager's squad on the pitch, and tapping any of their
   players opens the universal sheet.
3. **Effective ownership, not raw ownership.** A player started by three of five
   managers and captained by two is worth 100% of a squad's exposure, because a
   captain counts twice. Only starting XIs count — a player on three benches is
   owned by three rivals and scores for none of them.
4. **Swing** — `xP × (my exposure − effective ownership)`. The one number that
   says what a player does to my *rank* rather than my score. It unifies threats
   and differentials into a single signed figure, and it is the thing to read
   before making a transfer.
5. Threats, differentials and unowned transfer candidates as tabs on the same
   table.

**Chips are per half-season.** `bootstrap.chips` publishes the windows: every
chip is issued twice, once for GW1–19 and once for GW20–38. So a rival who spent
his Triple Captain in GW3 has another waiting at GW20, and "chips remaining" is
a question about windows rather than a single set. Verified against all five
managers' histories.

**The honest caveat**, stated on the page: rival picks for the upcoming gameweek
are private until the deadline, so every exposure figure comes from the last
confirmed squads and rivals may transfer before it.

A captain counts as 2× even when the pick was made under a Triple Captain chip —
exposure is forward-looking and the chip doesn't carry into the next gameweek.

## Stage 7 — Scout ✅ done

Product spec §5.

1. **Full-pool table** — search, position, max price, hide-unavailable and
   played-this-season filters, sortable on nine columns: xP next, xP over the
   run, fixture swing, points per £m, points per 90, points, form, ownership,
   and league ownership.
2. **Multi-select comparison** of two to four players, with the best value in
   each row highlighted so the winner of each line is visible without doing
   arithmetic. Price is inverted — cheaper wins.
3. **Template squad**, global or mini-league, diffed against my squad: which
   template players I'm missing (downside exposure) and which of mine are off
   template (where my season differs), with the overlap percentage.

**Fixture swing is next X minus last X** on the same fixture-value scale as the
ticker, so a player whose run is about to turn is findable before his price
moves.

**Points per 90 is null below 90 minutes**, not a huge number from a cameo. The
whole point of the column is to separate a good player from one who has simply
played more, and a 12-minute substitute with a goal would otherwise top it.

**The whole pool ships with the page** — all 654 players, 37.7KB gzipped —
so filtering, sorting and comparing are synchronous. The player sheet still
loads on demand: sending every player's fixtures and per-90s as well would be an
order of magnitude more for a panel that shows one of them.

**Split that the build forced:** `model/scout.ts` is pure (types, template
logic) and `model/scout-data.ts` is the server loader. The template view is a
client component and imports `templateSquad` at runtime; while both lived in one
file that dragged `use cache` and `next/cache` into the browser bundle and
failed the build.

## Stage 8 — Analysis ✅ done

Product spec §4 — decision quality, not raw points.

1. **Captaincy** — points lost as `(best in my XI − my captain) × multiplier`,
   per gameweek and as a bar chart, so one disaster is distinguishable from a
   slow bleed. The multiplier matters: a poor Triple Captain costs three times
   the gap, not two.
2. **Chip efficiency** (added beyond the spec) — what each chip actually bought.
   Triple Captain is worth one extra multiple of the captain's return, Bench
   Boost exactly what the bench scored. Wildcard and Free Hit reshape a whole
   squad, so there is no counterfactual and the page says so rather than
   inventing a number.
3. **Bench** — points left on the bench per gameweek, the highest-scoring
   benched player each week, and every automatic substitution with what it
   gained.
4. **Transfer ROI** — points in minus points out since the move, minus the hit.
5. **Against the field** — score vs the game and league averages, margin over
   the game average, and rank trajectory.

**Charts are hand-rolled SVG.** No library: every series is at most 38 points,
anything off the shelf would need restyling to the tokens, and these render on
the server with no JavaScript. Colours are CSS custom properties, so the charts
follow the theme.

**The API cost is handled the same way as `bootstrap-static`.** `event/{gw}/live/`
is ~464KB and we need one number per player, so the fetch stays uncached and the
trimmed map (6.4KB) is cached. A gameweek whose `data_checked` is true can never
change again, so settled gameweeks get the `settled` profile and are fetched once
for the season; the loader itself is cached, so the page is fully static.

**Bug this stage caught: gross vs net points.** `entry/{id}/history/` reports
each gameweek's `points` *before* transfer hits, while the league standings count
totals *after* them — a manager who took a −4 sums to four more than his rank
reflects. Every comparison now uses net points, so Analysis's margins reconcile
with the League page's gaps. Verified: −8.4 vs the league, matching 216 against a
league average of 224.4.

**Left out deliberately, and said so on the page:**

- The "highest xP" captaincy baseline. It needs the projection as it stood before
  a deadline; the feed re-projects the past, so it cannot be recovered (§7.4).
- The "highest owned" captaincy baseline. FPL publishes only *current*
  ownership, so judging a GW1 decision by today's figures is hindsight.
- Bench cause attribution (rotation vs. injury). It needs a player's status that
  week, which the API doesn't keep — the spec already flagged this as likely
  underivable.

## Post-v1 refinements

### Player sheet: form strip ✅ done

The sheet's vertical "Upcoming" list became two horizontal rows — last five
gameweeks above, the horizon below (design spec §6.10). Per-match history comes
from `element-summary/{id}/` via `model/element.ts`, fetched on sheet open only.

Settled while building it:

- **The column is a gameweek, not a match.** The xP feed prices a gameweek, so a
  double is summed rather than split and the two rows stay comparable.
- **The two rows are rated against different peer groups.** Measured against the
  live feed: across every projected player the per-gameweek thirds sit at
  0.31/2.64 (DEF) and 0.25/1.61 (FWD), which rates a two-point blank *green*.
  Across players clearing the minutes threshold they sit at 2.63/3.43 and
  2.95/4.21, which rates it red — and matches the terciles of actual returns
  from `event/{gw}/live/` (DEF 1/3, FWD 1/2). So results go through the new
  `rateReturn`; forecasts keep `rateGameweek`, whose wide band is the right one
  for "will he even start".
- **Grey ≠ red.** Zero minutes is unrated, not rated badly.
- Keepers show saves where outfielders show xG; theirs is 0.00 every week.

Known limit: the result band is still built from *forecasts* for starters rather
than from actual returns, which would cost five `event/{gw}/live/` fetches. The
two agree at every integer score today, so it isn't worth the calls yet.

## Stage 9 — Deploy & automate

1. Vercel project, env vars set.
2. Scheduled refresh (Vercel cron) after each gameweek and at ~02:00 UK for price
   changes, to warm the cache rather than leaving the first visitor to pay for it.
3. Delete `/debug`.
4. `use cache` entries are per-instance and do not survive a deploy. If that
   shows up as a slow first load, the answer is `use cache: remote` or a cache
   handler — not a database.

---

## Open questions to settle as we go

Carried from product spec §11, each pinned to the stage that forces the decision:

| Question | Settled at |
|---|---|
| ~~Unprojected players: hide, or sort last with a flag~~ | Settled: sort last, flagged |
| Fixture difficulty: from match data, or derived from the xP feed | Deferred — FPL FDR accepted as interim |
| ~~Form vs. fixture weighting in the combined rating~~ | Settled: 0.4 form / 0.6 fixtures |
| ~~RAG peer group: whole position, or price bracket too~~ | Settled: whole position |
| ~~"Next X games" — global setting or per page~~ | Settled: per page |
| ~~Threats formula: weight rivals near me more heavily?~~ | Settled: effective ownership, all rivals equal — see swing |
| ~~Club badges: official assets or colour chips~~ | Settled: official assets |
| ~~Bench-loss attribution (rotation vs. injury)~~ | Settled: not derivable, left out |
| ~~Fallback if the xP provider goes down or changes shape~~ | Settled: no fallback, no database |
