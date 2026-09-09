# FPL Tracker

A personal Fantasy Premier League planning tool. Midweek decision aid, not a live
scores app — the official app already does live well.

Expected points — the engine everything else is derived from — come from the
[FPL Copilot API](https://api.fplcopilot.com/api/expected-points?window=6).

- **Product spec:** [docs/fpl-app-spec.md](docs/fpl-app-spec.md)
- **Design spec:** [docs/fpl-app-design-spec.md](docs/fpl-app-design-spec.md)
- **Build roadmap:** [docs/roadmap.md](docs/roadmap.md)

## Setup

```bash
npm install
cp .env.example .env.local   # then fill in the two ids
npm run dev
```

`.env.local`:

| Variable | Where to find it |
|---|---|
| `FPL_ENTRY_ID` | `fantasy.premierleague.com/entry/<ID>/event/1` when viewing your own team |
| `FPL_LEAGUE_ID` | `fantasy.premierleague.com/leagues/<ID>/standings/c` for your mini-league |

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server on http://localhost:3000 |
| `npm run build` | Production build |
| `npm run test` | Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

## Structure

```
src/
  app/                 routes — / (My Team), /league, /analysis, /scout, /fixtures
  components/
    layout/            app bar, sidebar, bottom tab bar
    ui/                card, section, RAG, pills, stat, states, fixture cell
  lib/
    fpl/               typed FPL API client — types, endpoints, caching
    xp/                FPL Copilot expected-points client
    model/             xp.ts (the xP interface); normalisation from Stage 2
    config.ts          entry/league ids and tunable defaults
    utils.ts           formatting helpers
tests/                 vitest
docs/                  specs and roadmap
```

## Conventions

- **Design tokens live once**, in `src/app/globals.css`, and are mapped into
  Tailwind via `@theme inline`. Never hardcode a hex value in a component.
- **All FPL requests go through `src/lib/fpl/api.ts`.** The API sends no CORS
  headers, so fetches are server-side only.
- **All expected points come from `src/lib/model/xp.ts`**, which wraps the FPL
  Copilot feed. Players it doesn't cover are `null`, never `0`.
- Prices are tenths of a million (`now_cost: 60` → £6.0m). Numeric-looking
  fields (`form`, `ep_next`, xG/xA) are strings — parse at the model layer.
- Dark only. Colour is semantic: RAG ratings and one purple accent.
- Installable: add to home screen for a standalone, chrome-free app. Tab state
  is optimistic and every route is prefetched — see design spec §8.
