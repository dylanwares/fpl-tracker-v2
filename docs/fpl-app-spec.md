# FPL Tracker — Product Spec

**Status:** Draft v0.3 — expected points now sourced from the FPL Copilot API (§7) rather than modelled in-house
**Scope:** Personal tool, single user. Midweek planning aid — not live scores or live rank (the official app already does those well).
**Primary goal:** Win one specific mini-league. Overall rank is a secondary nice-to-have.
**Stack:** Built with Claude Code, deployed on Vercel.

---

## 1. Pages

Five pages. "Rivals" and the old standalone "League" page have merged into a single **League** page.

| Page | Purpose |
|---|---|
| **My Team** | Stats on the players currently in my squad, RAG-rated |
| **League** | My team tracked against the rest of a specific mini-league |
| **Analysis** | Analysis of my own decision-making across the season |
| **Scout** | Transfer research across the entire FPL player pool |
| **Fixtures** | In-depth fixture ticker plus recent team form |

Underpinning all five: **an expected points (xP) engine** (§7), sourced from the FPL Copilot API. It is the engine, not a feature — most of what each page shows is either xP or something derived from it.

---

## 2. My Team

A list of every player in my squad, **RAG-rated on how they are performing.**

### 2.1 Layout

One row per player (15 rows), ordered by position (GK → DEF → MID → FWD), starting XI above bench. Each row shows:

- Player name, club badge, position, current price
- A RAG dot/pill per metric, plus an overall RAG
- Next fixture(s) with difficulty
- Expandable row for the underlying numbers

### 2.2 The three metrics

**A. Points compared to average of position**
Total points vs. the mean total points of all players in the same position. Filter the comparison pool by minutes played (e.g. ≥ 30% of available minutes) so the average isn't dragged down by squad fillers who never play — otherwise almost every owned player looks green and the signal is worthless.
Express as a delta or a ratio (e.g. `+18 pts` / `1.4× positional avg`).

**B. Points per £M**
`total_points / current_price`, RAG'd against the positional average of the same ratio. This metric punishes premiums structurally — a 14.0 forward can be a correct pick and still be amber — so read it as "is this price justified", not "should I sell".

**C. xP next game / upcoming**
Expected points for the next gameweek from the xP feed (§7), plus a rolling sum over the next X GWs matching the Fixtures horizon. Players the feed doesn't cover show "no projection" rather than a zero.

### 2.3 RAG thresholds

Each metric is scored independently against its positional peer group.

| Rating | Rule (per metric) |
|---|---|
| 🟢 Green | Top third of the positional peer group |
| 🟠 Amber | Middle third |
| 🔴 Red | Bottom third |

Overall: green if two or more metrics are green and none are red; red if two or more are red; amber otherwise. Tune once there's real data on screen.

**Edge cases:**
- Very few minutes (injured, new signings, rotation risks) → "insufficient data" state, not a misleading red.
- GW1–4 — points-based metrics are noisy. Weight toward xP until a minutes threshold is met.
- Flagged players (injured/suspended) surface the flag regardless of RAG.

---

## 3. League

Tracks my team against the other teams in a specific mini-league. Four blocks.

### 3.1 My position summary

Headline strip at the top:

- Current rank and total points
- **Points behind the rival above**
- **Points ahead of the rival below**
- Rank movement since last gameweek

These three numbers are the reason the whole app exists — they should be the largest thing on the page.

### 3.2 League table

Full standings, one row per manager:

- Rank, manager name, team name, GW points, total points
- **Red/green arrow showing placement change in the last gameweek** (with the number of places moved)
- **Chips remaining** per manager — Wildcard, Free Hit, Bench Boost, Triple Captain
- My row visually pinned/highlighted so it stays findable in a long table
- **Each rival is clickable** → opens their squad for the current gameweek: their XI, bench, captain, and each player's xP for the upcoming GW

Chips remaining is a strong signal for planning — a rival holding a Bench Boost and a Wildcard into a double gameweek is a different threat to one who has spent everything.

### 3.3 Threats

Players **highly owned within the mini-league** that also have **good expected points** for the upcoming gameweek(s).

- Ranked by **effective ownership × xP**, not raw ownership. A captain is two
  squads' worth of exposure, and a benched player is none — EO = (starters +
  captains) / managers, which is the figure that actually predicts places lost
- The unified form of this is **swing**: `xP × (my exposure − EO)`. Positive
  means I gain places when he returns, negative means I bleed them. Threats and
  differentials are the two halves of that one number
- Split into "owned by me" and "not owned by me" — the second list is the actionable one
- Show league ownership % alongside global ownership %, since the gap between them is itself informative

### 3.4 Differentials

The inverse: the best players I own that **the rest of the league doesn't**.

- Ranked by `xP × (1 − league ownership %)`
- Also worth surfacing high-xP players nobody in the league owns, as candidate transfers rather than just current holdings
- Note: differentials only matter proportionally to how far behind I am. Consider surfacing this as context — chasing differentials from first place is usually wrong.

---

## 4. Analysis

Stats on my own general performance, focused on **decision quality rather than raw points**. Three sections carried from the notes:

### 4.1 Captaincy

- Points lost from captaincy picks: `(best possible captain score − actual captain score)` summed across the season
- Per-gameweek breakdown so a single disaster is distinguishable from a slow bleed
- Comparison of my actual captain score against the "always captain the highest-owned player" and "always captain highest xP" baselines — this tells me whether my captaincy process is actually adding anything

### 4.2 Bench

- Points wasted on the bench, cumulative and per-gameweek
- Broken down by cause where possible: rotation misread, injury, wrong bench order
- Automatic substitution successes vs. misses

### 4.3 Transfer ROI

- For each transfer: points scored by the player in, minus points scored by the player out, over the gameweeks since the transfer, minus any hit taken
- Rolling season total, so it's visible whether transfers are net positive at all
- Flag hits (-4s) separately — a hit that returned +2 is still a loss against the do-nothing baseline

### 4.4 General

- Points vs. league average and vs. overall average, by gameweek
- Best and worst gameweeks
- Season rank trajectory

---

## 5. Scout

The transfer research page — the same comparative logic as My Team applied to the entire FPL player pool.

### 5.1 Player comparison table

Sortable, filterable table of all players. Filters: position, price range, team, minutes threshold, availability. Columns:

- **Fixture swing** — change in fixture difficulty over the next X games vs. the last X, so players whose run is about to turn are findable before their price rises
- **Expected points** — next GW and rolling next X GWs (§7)
- **Points per £M**
- **Points per 90** — separates genuinely good players from players who've simply played more minutes
- Supporting: form, minutes, xG/xA per 90, ownership, price change trend

Multi-select two to four players → side-by-side comparison view with the same metrics and their upcoming fixtures.

### 5.2 Template squad

The "template" — the squad most FPL managers converge on.

- Most-owned player at each position by global ownership
- My squad diffed against it: which template players I'm missing, which non-template players I hold
- Template ownership is a risk measure, not a target: knowing I'm missing a 60%-owned forward tells me my downside exposure if he hauls

Worth showing both the **global** template and the **mini-league** template — since the goal is winning one league, the local template matters more.

---

## 6. Fixtures

### 6.1 Fixture ticker

- Grid of all 20 teams × next X gameweeks, colour-coded by difficulty
- **Sortable by best fixtures over the next X games**, with X configurable (default 5)
- Handles blanks and doubles explicitly — a double gameweek should be visibly different, not just a second cell
- Difficulty currently comes from FPL's official FDR, accepted as an interim
  source at Stage 5 (it has a real 2–5 spread this season). It is set pre-season
  and does go stale, so §7.5 still stands as an upgrade — `model/difficulty.ts`
  is the single seam it would change
- Sorting uses **fixture value** (`Σ 6 − difficulty` per gameweek), not average
  difficulty, so a blank scores 0 and a double counts both

### 6.2 Form table

- Team performance over the **previous 5 games**: goals scored, goals conceded,
  clean sheets, points — from actual results
- **xG for/against are season-to-date, not the form window.** The FPL API
  publishes no per-match expected goals, so team xG is derived as the sum of its
  players' individual `expected_goals`, and team xGC as the first-choice
  keeper's `expected_goals_conceded`. Per-window xG would need a second data
  source
- Separate attacking and defensive form — a team can be great to own attackers from and terrible to own defenders from
- Sortable to answer "who is performing best right now"

### 6.3 Combined view

The bit that makes the page worth building: **form combined with fixture difficulty**, so it answers "who is in good form *and* has a good run coming" in one number.

Suggested approach: express both as z-scores across the 20 teams, then combine as a weighted sum (form weighted slightly lower than fixtures, since fixtures are forward-looking and form partially regresses). Show attack and defence versions separately.

This rating no longer feeds the xP model — that comes from the provider now — so it serves this page alone. Which raises the question in §7.5: build it from match data, or derive it from the xP feed so the ticker and the projections can't contradict each other?

---

## 7. Expected points model

xP is the engine the whole app runs on. It is **sourced from the FPL Copilot API**
and used as published — not modelled, adjusted or second-guessed in-house — a first attempt at our own model produced
numbers that didn't line up with the established public models, and this feed
does the job well enough that the effort is better spent on the pages that use it.

### 7.1 Source

```
GET https://api.fplcopilot.com/api/expected-points?window={n}
```

- `window=n` returns the next `n` gameweeks starting from the upcoming one.
  `window=1` → the next GW alone; `window=38` → the rest of the season.
  Omitting the parameter returns every gameweek, past ones included.
- One row per player, each carrying `gameweeks[]` of `{ gw, points, minutes }`,
  plus price, ownership, and per-90 rates for xG, xA, defensive contribution and
  saves.
- `total_points` on a row is the **sum across the requested window**, not the
  player's actual season points. Normalised to `windowPoints` in our model layer
  so it can't be confused with the FPL API's field of the same name.
- Response is ~670KB at `window=6`, ~2.2MB for the full season. gzip supported,
  `cache-control: private`, no ETag.

### 7.2 Known limits of the feed

These are constraints to design around, not reasons to reject it:

- **Coverage is partial.** 626 players against the FPL API's 653. The missing
  ~28 are mostly fringe squad members, but not all — players with real minutes
  have been absent. Anything unprojected must render as "no projection", never
  as zero, or a real player silently ranks last.
- **No component breakdown.** The feed gives points and minutes, not the goals /
  assists / clean-sheet / bonus split. We lose the ability to explain *why* a
  projection is high. Partly recoverable from the per-90 rates it does include.
- **Past gameweeks are re-projections.** Requesting the full season returns the
  provider's *current* view of past gameweeks, not the projection it published
  at the time. Useful as a rough calibration check; it is not a clean backtest,
  and shouldn't be presented as one.
- **Doubles and blanks are unconfirmed.** In the snapshots inspected so far,
  every player has exactly one row per gameweek. Whether a double gameweek
  arrives as one summed row or two rows is untested — our normaliser sums
  duplicates so either behaviour gives the right total.
- **It is an unofficial third-party service** with no published terms, rate
  limits or uptime guarantee. Cache aggressively, fetch once per window per TTL,
  and keep the interface swappable.

### 7.3 Interface

All xP access goes through `src/lib/model/xp.ts`. No page imports the provider
client directly, so the source can be replaced — with a different feed, or with
our own model — without touching a single page:

```ts
getProjections(horizon)        // Projections for the next N gameweeks
  .get(elementId)              // PlayerProjection | null
  .pointsFor(elementId, gw)    // number | null
  .sumOver(elementId, gws?)    // number | null
```

Players are keyed by **FPL element id**, which was verified to match
`bootstrap-static` for all 626 rows; `fpl_code` is carried as a stable fallback.

### 7.4 Use the number as given

The feed's `points` value is used exactly as published. We do not:

- blend it with, or fall back to, the FPL API's `ep_next` — that field is not
  read anywhere in the app, and is deliberately absent from our FPL types
- weight it by form, fixture difficulty, or our own team ratings
- recalculate, smooth, or calibrate it

The provider's model is the model. The only arithmetic we do on a projection is
totalling gameweeks, and even that is avoided where possible: request the window
you want and read the total the feed already provides.

The trade-off is accepted deliberately. We have no independent accuracy record
and no way to tell whether the feed runs optimistic — if it drifts, the app
drifts with it. What we get in return is one source of truth, and no risk of a
half-tuned adjustment layer making a decent projection worse.

**If the feed is unavailable there is no fallback.** Settled at Stage 2: no
second provider, no `ep_next`, no stored copy. The pool still builds from FPL
data, every non-xP number still renders, xP columns read "—", and a banner says
the projection feed is down. The rule that there is exactly one source of
expected points is worth more than partial coverage from a source we don't
trust.

A stored copy was considered and rejected. It would have meant a database whose
only consumer was one Analysis baseline (§4.1's "versus the highest-xP pick"),
which needs the projection as it stood *before* a deadline — the feed re-projects
past gameweeks, so that number cannot be recovered later. That baseline is
dropped unless a snapshot store is added back. Everything else in §4 is measured
in actual points and is fully recoverable from the FPL API, whose per-gameweek
picks, chips and auto-subs remain readable for any manager indefinitely.

### 7.5 Team strength and fixture difficulty

The dynamic fixture difficulty rating (§6.3) is still ours to build — it is what
the Fixtures page displays, and FPL's official FDR is set pre-season and goes
stale. It no longer has to feed the xP model, which makes it a smaller job:
rolling xG for / against per team, weighted toward recent matches, adjusted for
home/away and opponent quality, expressed as z-scores across the 20 teams.

Open question for that stage: derive team ratings from match data as originally
planned, or aggregate the xP feed itself (summed projected points per team per
gameweek is a serviceable proxy for attack strength, and projected defender
points for defensive strength). The second is cheaper and guarantees the ticker
agrees with the xP shown everywhere else.

---

## 8. Data

Two sources: the official FPL API for everything factual, and the FPL Copilot
API (§7) for expected points.

### 8.1 FPL API

Field names verified against the live endpoints, 2026/27 season:

- `bootstrap-static/` — all players, prices, points, position, form, minutes, ownership, xG/xA; plus teams and gameweek metadata (its `ep_next` is unused — see §7.4)
- `entry/{id}/` — manager summary and season history
- `entry/{id}/event/{gw}/picks/` — squad, captain, vice, bench order (mine and rivals')
- `entry/{id}/history/` — chips used, transfers, per-gameweek points
- `entry/{id}/transfers/` — transfer history for ROI calculations
- `leagues-classic/{id}/standings/` — mini-league table
- `fixtures/` — upcoming and completed fixtures
- `element-summary/{playerId}/` — per-player match history

Prices are in tenths of a million; divide by 10 for display.

Two fields worth noting that the earlier draft predates: `defensive_contribution`
(the 2-point rule) is on every element, and the `teams` strength fields sit at
`0`/`null` for the first few gameweeks of a season — which is exactly why the
fixture difficulty rating has to be ours (§7.5).

### 8.2 Expected points API

`api.fplcopilot.com/api/expected-points?window={n}` — see §7 for the shape, its
limits, and the interface that wraps it. Prices there are already in millions,
unlike the FPL API.

### 8.3 Caching

The data only changes meaningfully after each gameweek and at price-change time
(roughly 01:30 UK), and this is a planning tool rather than a live tracker — the
official app already covers matchday. So lifetimes are generous by design.

Caching is done with **Cache Components** (`cacheComponents: true`): data
fetching is dynamic by default and each model function opts in with `use cache`,
a `cacheLife` profile and a `cacheTag`. Profiles are named for the domain in
`next.config.ts`:

| Profile | Applies to | Revalidate |
|---|---|---|
| `fplData` | players, teams, fixtures | 15 minutes |
| `projections` | the xP feed | 1 hour |
| `settled` | finished gameweeks, which never change again | 30 days |

Two consequences worth knowing:

- **The 2MB problem is solved by caching the model, not the response.**
  `bootstrap-static` is 2.32MB and Next refuses to cache a fetch response over
  2MB. `src/lib/fpl/client.ts` therefore does no caching at all; the cached unit
  is the trimmed model in `src/lib/model/game.ts`, which is a fraction of the
  size. A full-season xP request (~2.2MB) would hit the same wall, and is
  avoided the same way.
- **Anything uncached must sit inside `<Suspense>`**, or the route fails to
  prerender. This is what keeps navigation instant (design spec §8.3): every
  route ships a static shell. Cache Components also enables Partial Prerendering
  and React `<Activity>`, which preserves each tab's state across navigation.

Reading the clock (`new Date()`, `Date.now()`) during a prerender is unstable
data and Next will refuse to build the route. Capture timestamps inside the
cached scope, where they mean "when this was fetched".

On-demand invalidation stays as it was: the refresh button is a Server Action
calling `updateTag` over every tag.

---

## 9. Out of scope (v1)

- Live points and live rank
- Transfer execution — this tool advises, the official app acts
- Multi-user accounts or public hosting

---

## 10. Build order

Buying the xP model rather than building it reorders this substantially: what
used to be the largest and riskiest piece is now an integration, and the pages
that depend on it are no longer blocked behind it.

1. **xP integration** — the provider client and the `src/lib/model/xp.ts`
   interface every page reads from. Done.
2. **Data layer** — cache, normalised player and team models, the fixture model
   with blanks and doubles, joined to the projections by element id. Done.
3. **My Team** — exercises most of the data layer
4. **Fixtures** — needs the team strength / dynamic FDR work (§7.5), which now
   serves only this page
5. **League** — the page closest to the actual goal; needs rival picks, so it's the heaviest on API calls
6. **Scout** — My Team logic applied to the full pool
7. **Analysis** — needs a season of history to be interesting, so it can come last

No snapshot store and no database: see §7.4 for why, and for the one Analysis
baseline that costs.

---

## 11. Open questions

- **Form/fixture weighting:** what ratio in the combined team rating, and is it tuned by hand or fitted against past results?
- **X in "next X games":** user-set per page, or one global setting?
- **RAG peer group:** all players in the position, or only a comparable price bracket?
- **Threats ranking:** is `league ownership × xP` the right formula, or should it weight rivals near me in the table more heavily than those far behind?
- **Bench points attribution:** distinguishing "rotation misread" from "injury" may not be reliably derivable from the API — might need manual tagging or dropping the breakdown.
- **Rival picks before deadline:** other managers' teams are hidden until the gameweek starts, so the League page's rival-squad view is retrospective. Worth confirming what's actually available and when.
- ~~**Unprojected players**~~ — settled at Stage 2: kept in the pool, flagged as
  not projected, and sorted last whichever way an xP column is pointed. Never
  hidden, never zero. A player the feed doesn't cover is often a new signing,
  which is exactly the kind of thing worth noticing.
- **Fixture difficulty source:** build team ratings from match data, or aggregate the xP feed per team (§7.5)?
- ~~**Feed dependency**~~ — settled at Stage 2: no fallback. Warning banner, xP
  columns blank, everything else renders. See §7.4.
