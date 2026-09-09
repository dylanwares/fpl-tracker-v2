# FPL Tracker — Design Spec

**Status:** Draft v0.2 — adds §8, native app feel
**Companion to:** `fpl-app-spec.md` (product spec)
**Platform:** Mobile-first, single user. Desktop uses the same layout with more breathing room.
**Theme:** Dark only.
**Reference:** Midnite — layered near-black surfaces, colour reserved for data and actions, dense information without feeling cramped.

---

## 1. Design principles

Four rules borrowed from the reference, in priority order:

1. **The background disappears.** Near-black base, cards a shade lighter, borders barely visible. Nothing in the chrome competes with the numbers.
2. **Colour means something.** Every use of colour is semantic — a rating, a state, an action. Nothing is coloured for decoration. This is what makes a dense table readable at a glance.
3. **Dense, but with air between groups.** Tight row spacing inside a table, generous spacing between sections. The reference packs a lot onto one screen and stays scannable because the grouping is clear.
4. **One accent.** Purple is the only interactive colour. If everything is highlighted, nothing is.

---

## 2. Colour

### 2.1 Surfaces

| Token | Value | Use |
|---|---|---|
| `--bg` | `#0B0B0E` | Page background |
| `--surface-1` | `#141418` | Cards, table containers |
| `--surface-2` | `#1C1C22` | Raised elements, active rows, inputs |
| `--surface-3` | `#26262E` | Hover, pressed states |
| `--border` | `#2A2A33` | Card and cell borders — subtle, near-invisible |
| `--border-strong` | `#3A3A45` | Dividers that need to read |

### 2.2 Text

| Token | Value | Use |
|---|---|---|
| `--text-1` | `#FFFFFF` | Numbers, player names, headings |
| `--text-2` | `#A0A0AD` | Labels, column headers, secondary stats |
| `--text-3` | `#6B6B78` | Metadata, timestamps, disabled |

### 2.3 Accent — Premier League purple

The official PL purple is `#37003C`. It's an aubergine designed for white backgrounds and it is effectively invisible against `#0B0B0E`. So: keep the official colour for deep tinted surfaces, and derive a brighter ramp at the same hue (~293°) for anything interactive.

| Token | Value | Use |
|---|---|---|
| `--accent-900` | `#37003C` | Official PL purple. Header gradients, tinted panels, chart fills. Never for text or icons. |
| `--accent-700` | `#6B1E8F` | Deep fills, selected row backgrounds at low opacity |
| `--accent-600` | `#8B2FD6` | **Primary buttons and fills.** White text on this passes contrast. |
| `--accent-400` | `#B14BF4` | **Text, icons, borders, active tab indicators** on dark surfaces |
| `--accent-glow` | `rgba(177,75,244,0.12)` | Selected/active row tint, focus rings |

Rule of thumb: `--accent-600` when purple is the background, `--accent-400` when purple is the foreground.

### 2.4 Semantic — RAG and states

RAG ratings are the most important colour in the app, so they get the most saturated values.

| Token | Value | Use |
|---|---|---|
| `--good` | `#00E87A` | Green rating, positive delta, rank up |
| `--warn` | `#FFB020` | Amber rating |
| `--bad` | `#FF5A5F` | Red rating, negative delta, rank down |
| `--neutral` | `#6B6B78` | Insufficient data, no change |

`--good` is derived from the PL brand green (`#00FF85`), pulled down slightly so it isn't blinding on black.

Red sits far enough from the purple accent in hue to stay distinct. Avoid the PL brand pink (`#FF2882`) entirely — it muddies against the accent.

### 2.5 Fixture difficulty scale

Five steps, same green→red direction as RAG so the mental model is consistent, but **desaturated fills with brighter text** so a full ticker grid doesn't overwhelm the page.

| Difficulty | Fill | Text |
|---|---|---|
| 1 — Very easy | `rgba(0,232,122,0.22)` | `#00E87A` |
| 2 — Easy | `rgba(0,232,122,0.11)` | `#7FEFB8` |
| 3 — Neutral | `rgba(107,107,120,0.14)` | `#A0A0AD` |
| 4 — Hard | `rgba(255,90,95,0.12)` | `#FF9A9D` |
| 5 — Very hard | `rgba(255,90,95,0.24)` | `#FF5A5F` |

Blank gameweeks: `--surface-1` with a diagonal hatch. Double gameweeks: cell split with a visible divider and a small `×2` badge.

---

## 3. Typography

**Family:** Inter, or any geometric sans with good tabular figures. System stack fallback.

**Critical:** enable `font-variant-numeric: tabular-nums` globally on anything numeric. Without it, every stat column jitters as values change and the whole app looks amateur. This is the single highest-impact typographic choice here.

| Role | Size (mobile) | Weight | Colour |
|---|---|---|---|
| Page title | 22px | 600 | `--text-1` |
| Section header | 15px | 600 | `--text-1` |
| Headline stat | 28px | 700 | `--text-1` |
| Body / player name | 15px | 500 | `--text-1` |
| Table cell | 14px | 500 | `--text-1` |
| Column header | 11px, `0.06em` tracking, uppercase | 600 | `--text-2` |
| Label / meta | 12px | 500 | `--text-2` |
| Micro | 11px | 500 | `--text-3` |

Desktop: bump body and table cells by 1px, headline stats by 4–6px. Everything else holds.

---

## 4. Space, radius, elevation

**Spacing scale (4px base):** 4, 8, 12, 16, 20, 24, 32, 48.

- Inside a table row: 12px vertical, 16px horizontal
- Between cards: 12px mobile, 16px desktop
- Section padding: 16px mobile, 24px desktop
- Page gutters: 16px mobile, 32px desktop

**Radius:** 8px on cards and rows, 10px on large containers, 6px on inputs and small chips, full round on pills and badges.

**Elevation:** no drop shadows. Depth comes from surface lightness and a 1px `--border`. This is what gives the reference its flat, precise feel — a shadow would break it immediately.

---

## 5. Layout

### 5.1 Mobile (default, 360–480px)

```
┌──────────────────────────┐
│ App bar  — title, GW, ⟳  │  56px, sticky
├──────────────────────────┤
│                          │
│  Scrollable content      │
│  Single column, 16px     │
│  gutters, stacked cards  │
│                          │
├──────────────────────────┤
│ ⚽  🏆  📊  🔍  📅        │  Bottom tab bar
└──────────────────────────┘
```

**App bar:** page title left, gameweek selector and refresh right. Sticky, `--bg` with a bottom `--border`, no blur.

**Bottom tab bar:** five items — My Team, League, Analysis, Scout, Fixtures. 56px tall plus `env(safe-area-inset-bottom)`. Icon 22px above a 10px label. Active state: icon and label in `--accent-400`, plus a 3px `--accent-400` bar along the top edge of the active item. Inactive: `--text-3`.

Five tabs is the maximum a bottom bar handles well and you have exactly five — no overflow menu needed, which is a good reason not to add a sixth page later without thinking hard about it.

### 5.2 Desktop (≥1024px)

Same information architecture, more room:

- Bottom tab bar becomes a **left sidebar**, 240px, matching the reference. Same five items, icon + label, active item gets a `--surface-2` fill and `--accent-400` left border.
- Content area max-width 1200px, centred, 32px gutters.
- Tables that scroll horizontally on mobile show all columns.
- Cards that stack on mobile can sit two-up where it makes sense (My Team summary + next fixtures; Analysis charts).

**Optional, Midnite's bet-slip analogue:** a persistent 320px right panel for the currently-selected player or rival. On Scout especially, tapping a player on mobile opens a bottom sheet; on desktop the same content fills that panel instead of covering the table. Worth building only if the table-plus-detail pattern actually feels cramped.

### 5.3 Breakpoints

`0` mobile → `768px` tablet (wider gutters, two-up cards) → `1024px` desktop (sidebar) → `1440px` (nothing new, just centred).

---

## 6. Components

### 6.1 Card / collapsible section

`--surface-1`, 8px radius, 1px `--border`. Header row: 15px/600 title left, chevron right, 44px tall, whole header tappable to collapse. This is the reference's core pattern (Match Result, Total Goals) and it works well for a page like League that has four distinct blocks.

Collapse state persists per section across sessions.

### 6.2 Segmented filter pills

Horizontal scrolling row of pills, used for position filters on Scout, gameweek ranges on Fixtures, metric switches on Analysis.

- Inactive: `--surface-2` fill, `--text-2` text, no border
- Active: `--accent-600` fill, white text
- 32px tall, 14px horizontal padding, full radius, 8px gap
- Scrolls horizontally with the first item flush to the gutter and a fade-out mask on the right edge

### 6.3 RAG indicator

Never colour alone — a red/green colourblind viewer sees an identical grey dot, and you'll also want this readable in a screenshot.

- **Compact (table cell):** 8px dot + the value in the RAG colour
- **Row-level (My Team):** 24×20px rounded pill, RAG colour at 18% opacity as fill, RAG colour text, letter `G`/`A`/`R`
- **Insufficient data:** `--neutral` dot with an en-dash, tooltip/tap explains why

### 6.4 Player row

The most-used component in the app. Mobile, 64px tall:

```
[badge] Player Name          G  A  R    12.4
        MID · ARS · £8.5              xP next
```

- Left: 28px club badge, name at 15px/500, meta line at 12px `--text-2`
- Middle: three RAG pills
- Right: the primary number for the current view, 16px/600, with an 11px `--text-3` label beneath
- Tap → opens the player sheet (§6.10). One interaction for a player anywhere
  in the app; no inline expansion
- Pressed state: `--surface-2`

### 6.5 Data table

For Scout and the League standings.

- Sticky header row, `--bg`, uppercase 11px `--text-2` column labels
- Sticky first column (player/manager name) when scrolling horizontally, with a 1px `--border-strong` right edge so the freeze point is obvious
- Rows 48px, alternating rows *not* shaded — use a 1px `--border` divider instead, which stays cleaner at high density
- My own row: `--accent-glow` background, 2px `--accent-400` left border
- Sorted column: header text in `--accent-400` with a caret
- Horizontal scroll on mobile with a subtle right-edge fade to signal more columns

### 6.6 Fixture ticker

- Rows = teams (28px badge + 3-letter code), columns = gameweeks
- Cells 44×36px mobile, showing opponent 3-letter code and H/A, filled per §2.5
- First column sticky
- Column headers `GW6`, `GW7`… sticky at top
- Sort control above the grid: "Best fixtures over next [3|5|8] games", as segmented pills

### 6.7 Headline stat block

For the League page summary — rank, points behind above, points ahead below.

Three-up on mobile, in a single `--surface-1` card: 28px/700 value over an 11px uppercase `--text-2` label, centred, separated by 1px `--border` verticals. Deltas coloured with `--good`/`--bad` and prefixed with ▲/▼.

### 6.8 States

- **Loading:** skeleton blocks in `--surface-2` with a slow shimmer. Never a spinner for content — the layout should hold its shape so nothing jumps when data lands.
- **Empty:** `--text-3` message, centred, 32px vertical padding, no illustration.
- **Error:** `--bad` inline message with a retry button, inside the card that failed. One failing section shouldn't blank the page.
- **Stale data:** small `--text-3` "Updated 2h ago" in the app bar. Given the caching strategy, knowing the data's age matters.

### 6.9 Pitch view (My Team)

The squad is shown the way the official app shows it, because that arrangement
is already learned: four rows in formation order, bench in a strip beneath.

- **The pitch is CSS, not an image.** Mown stripes, halfway line and centre
  circle are gradients on a `.pitch` class in `globals.css`. It scales to any
  width, costs no request, and recolours with the tokens. `--pitch-far` /
  `--pitch-near` are a deep green — a full FPL-green pitch would blow out every
  surface next to it in a dark theme.
- **Shirts and badges are the official artwork**, served from the same CDNs
  fantasy.premierleague.com uses and keyed by team *code* (stable across
  seasons), not team id. Nothing is vendored. Goalkeeper kits take a `_1`
  suffix.
- **Chip: 68px wide on mobile**, shirt above a two-line name plate — name, then
  the metric being shown.
- **Two things the official app doesn't show**, and the reason this view exists:
  a 3px overall-RAG bar down the left of the name plate, and an availability dot
  on the shirt (amber doubtful, red out).
- Captain and vice badges sit top-right of the shirt: `C`, `V`, or `T` when the
  Triple Captain chip is active.
- A pitch/list toggle sits above. Both views render on the server and are
  swapped with `hidden`, so switching costs nothing and the list's open rows
  survive a round trip.

The list view (§6.4) remains the place for the numbers. The pitch answers "how
does my team look", the list answers "why".

### 6.10 Player sheet (universal)

The one place the app answers "tell me more about him", opened from any player
anywhere — a pitch chip, a squad row, a Scout table cell, a League threat.

- **Native `<dialog>`**, opened with `showModal()`, so focus trapping, Escape
  and an inert background come from the platform rather than from us.
- **Bottom sheet below `sm`, centred panel above.** Grab handle on mobile only;
  `max-height: 88dvh` with the body scrolling inside and `overscroll-contain`
  so a flick at the end of the list doesn't scroll the page behind.
- Backdrop click closes. 220ms ease on entry — the one animation in the app
  that earns its keep, because a sheet appearing instantly reads as a glitch.
- **Mounted once, in the app shell.** Pages don't hold sheet state or pass
  callbacks down.
- **Content loads on open**, by element id, through a Server Action. Rows carry
  an id, not a payload — Scout will render the whole pool, and serialising 600
  player objects into the page to support a sheet showing one of them is the
  wrong trade. The panel holds its shape with a skeleton while it loads.

Sections, in order: identity and price, availability if flagged, ownership and
form, the three ratings with values and deltas, **upcoming fixtures with
difficulty and per-gameweek xP**, underlying per-90 numbers, season totals.

Per-gameweek xP is RAG'd against a typical single gameweek *for that position*,
so 6.2 reads as a strong week for a defender and an ordinary one for a premium
forward.

---

## 7. Interaction

- **Touch targets:** 44×44px minimum. Table rows at 48px clear this; RAG pills do not, so the whole row is the tap target, not the pill.
- **Thumb zone:** primary actions (filters, sort, gameweek selector) in the lower two-thirds. Nothing critical in the top-left corner.
- **Motion:** 150ms `ease-out` for state changes, 250ms for expand/collapse and sheet transitions. No page transitions. Respect `prefers-reduced-motion`.
- **Bottom sheets** rather than modals on mobile — draggable, dismiss on swipe down, max 85% viewport height.
- **Focus:** 2px `--accent-400` ring at 2px offset. Needed on desktop even for a single-user app.

---

## 8. Native app feel

The app should read as an installed app, not a website. Nothing here is
decorative — each item removes a specific tell.

### 8.1 Installed, not browsed

A web app manifest with `display: standalone`, plus `apple-mobile-web-app-capable`,
so adding it to the home screen launches it without a URL bar or browser chrome.
Theme and background colours are `--bg`, so the system UI matches the app rather
than framing it in white.

`viewport-fit=cover` lets content run under the notch and home indicator, with
`env(safe-area-inset-*)` padding in the app bar and tab bar keeping the controls
clear. Orientation is left unlocked — the fixture ticker is the one view that
benefits from landscape (§10).

### 8.2 Touch behaviour

| Tell | Fix |
|---|---|
| Grey flash on tap | `-webkit-tap-highlight-color: transparent` |
| 300ms delay before a tap registers | `touch-action: manipulation` |
| Rubber-band scroll past the end, pull-to-refresh | `overscroll-behavior-y: none` |
| Text selecting when you drag a tab bar | `user-select: none` on chrome only — content stays selectable so numbers can be copied |
| Accidental pinch-zoom in a dense table | `maximum-scale=1, user-scalable=no` |

The last one is a deliberate accessibility trade-off, taken because this is a
single-user tool and an accidental zoom mid-table is a constant annoyance.
Two lines in `viewport` put zoom back if it turns out to be the wrong call.

### 8.3 Navigation must feel instant

Routing exists, but the URL is not the point — the tab switch is. Three things
make it feel immediate:

1. **Tab state is optimistic.** The tab bar highlights and the title changes on
   *tap*, not when the route resolves. Waiting for a server round-trip before
   the UI acknowledges the touch is the single biggest thing that makes a web
   app feel like a web app.
2. **Every route is prefetched.** All five nav links are permanently on screen,
   so all five routes are prefetched and held in the client router cache. A tab
   switch is then a client-side render with no network.
3. **Every route has a `loading.tsx`.** When a page becomes dynamic — My Team
   needs squad data, League needs rival picks — navigation still happens
   instantly and a skeleton holds the layout while data streams in. The page
   never blanks.

**No transition animation between tabs.** Native tab bars cut straight across;
a slide or fade between tabs reads as a website trying to look like an app, and
it costs perceived speed. This is consistent with §7's "no page transitions".

### 8.4 State that persists like an app

- **Scroll position is remembered per tab** for the session, so returning to a
  tab returns you to where you were rather than the top of the page.
- **Collapsed sections persist** across launches (§6.1).

### 8.5 If it still isn't fast enough

Once the pages carry real data, the escalation — should tab switching ever
stutter — is parallel routes with all five panes mounted and hidden rather than
unmounted, which makes switching pure CSS at the cost of loading everything up
front. Worth doing only if measurement says so.

---

## 9. Implementation notes

Stack isn't decided yet. Recommendation: **Tailwind plus shadcn/ui**, because shadcn gives you the sheet, dialog, tabs and table primitives without a component library's opinions about visual style, which matters when you're imitating a specific look.

Either way, define the tokens above as CSS custom properties on `:root` first, then map them into whatever the styling layer is. That way the palette is one file rather than a search-and-replace, which you will want the first time the purple looks wrong in context.

```css
:root {
  --bg: #0B0B0E;
  --surface-1: #141418;
  --surface-2: #1C1C22;
  --border: #2A2A33;
  --text-1: #FFFFFF;
  --text-2: #A0A0AD;
  --accent-600: #8B2FD6;
  --accent-400: #B14BF4;
  --good: #00E87A;
  --warn: #FFB020;
  --bad: #FF5A5F;
}
```

Set `color-scheme: dark` so native controls (scrollbars, date pickers) render dark rather than punching a white hole in the page.

---

## 10. Open questions

- **Club badges:** official PL badge assets, or generated colour chips per team? Badges look far better but need sourcing and consistent sizing at 28px.
- **Charts on Analysis:** which library, and does it theme cleanly to these tokens? Most default palettes will fight the accent — budget time for restyling.
- **Purple vs. RAG green:** in a dense table with purple active states and green ratings, check whether they compete. If they do, the fix is desaturating the accent rather than the ratings — the ratings carry more information.
- **Landscape on mobile:** the fixture ticker is the one view that genuinely benefits from it. Support it there, or lock portrait everywhere? Orientation is currently unlocked in the manifest (§8.1).
