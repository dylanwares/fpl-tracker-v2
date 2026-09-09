/**
 * Types for the public FPL API (https://fantasy.premierleague.com/api/).
 * Field names verified against the live endpoints, 2026/27 season.
 * Only fields we actually consume are typed; the API returns more.
 *
 * Money is in tenths of a million (`now_cost: 60` === £6.0m).
 * Numeric-looking strings (`form`, `ep_next`, `expected_goals_per_90`, ...)
 * really are strings in the payload — parse at the normalisation layer.
 */

export type ElementTypeId = 1 | 2 | 3 | 4; // GKP, DEF, MID, FWD
export type PlayerStatus = "a" | "d" | "i" | "s" | "u" | "n"; // available, doubtful, injured, suspended, unavailable, not in squad

export interface FplElementType {
  id: ElementTypeId;
  singular_name: string;
  singular_name_short: "GKP" | "DEF" | "MID" | "FWD";
  plural_name: string;
  squad_select: number;
  squad_min_play: number;
  squad_max_play: number;
}

export interface FplTeam {
  id: number;
  code: number;
  name: string;
  short_name: string;
  strength: number | null;
  /** FPL's own strength ratings. Reset each season and 0 until a few GWs in —
   *  we compute our own team ratings instead (product spec §7.2). */
  strength_overall_home: number;
  strength_overall_away: number;
  strength_attack_home: number;
  strength_attack_away: number;
  strength_defence_home: number;
  strength_defence_away: number;
  played: number;
  win: number;
  draw: number;
  loss: number;
  points: number;
  position: number;
  pulse_id: number;
}

export interface FplElement {
  id: number;
  code: number;
  team: number;
  team_code: number;
  element_type: ElementTypeId;
  first_name: string;
  second_name: string;
  web_name: string;
  known_name: string | null;
  squad_number: number | null;
  photo: string;

  /** Price in tenths of a million. */
  now_cost: number;
  cost_change_event: number;
  cost_change_start: number;
  selected_by_percent: string;

  status: PlayerStatus;
  news: string;
  news_added: string | null;
  chance_of_playing_this_round: number | null;
  chance_of_playing_next_round: number | null;

  total_points: number;
  event_points: number;
  points_per_game: string;
  form: string;
  // `ep_this` / `ep_next` are deliberately not typed. Expected points come from
  // the FPL Copilot feed alone (`src/lib/model/xp.ts`) — there is no fallback to
  // FPL's own projection and no blending of the two.

  minutes: number;
  starts: number;
  starts_per_90: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  saves_per_90: number;
  bonus: number;
  bps: number;

  /** Defensive contribution points (2 pts) — introduced 2025/26. */
  defensive_contribution: number;
  defensive_contribution_per_90: number;
  tackles: number;
  recoveries: number;
  clearances_blocks_interceptions: number;

  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  expected_goals_per_90: number;
  expected_assists_per_90: number;
  expected_goal_involvements_per_90: number;
  expected_goals_conceded_per_90: number;
  clean_sheets_per_90: number;
  goals_conceded_per_90: number;

  influence: string;
  creativity: string;
  threat: string;
  ict_index: string;

  penalties_order: number | null;
  corners_and_indirect_freekicks_order: number | null;
  direct_freekicks_order: number | null;

  transfers_in_event: number;
  transfers_out_event: number;
  value_form: string;
  value_season: string;
}

export interface FplEvent {
  id: number;
  name: string;
  deadline_time: string;
  deadline_time_epoch: number;
  average_entry_score: number;
  highest_score: number | null;
  finished: boolean;
  data_checked: boolean;
  is_previous: boolean;
  is_current: boolean;
  is_next: boolean;
  most_selected: number | null;
  most_transferred_in: number | null;
  most_captained: number | null;
  most_vice_captained: number | null;
  top_element: number | null;
  transfers_made: number;
  chip_plays: { chip_name: string; num_played: number }[];
}

/**
 * Chip windows. Every chip is issued once per half of the season, so a rival
 * who spent his Triple Captain in GW3 has another one waiting from GW20 —
 * "chips remaining" is a question about windows, not a single set.
 */
export interface FplChip {
  id: number;
  name: "wildcard" | "freehit" | "bboost" | "3xc" | string;
  number: number;
  start_event: number;
  stop_event: number;
  chip_type: "transfer" | "team" | string;
}

export interface FplBootstrap {
  chips: FplChip[];
  events: FplEvent[];
  teams: FplTeam[];
  elements: FplElement[];
  element_types: FplElementType[];
  total_players: number;
  game_settings: Record<string, unknown>;
}

export interface FplFixtureStat {
  identifier: string;
  a: { value: number; element: number }[];
  h: { value: number; element: number }[];
}

export interface FplFixture {
  id: number;
  code: number;
  /** null for fixtures not yet assigned to a gameweek (postponed). */
  event: number | null;
  kickoff_time: string | null;
  started: boolean;
  finished: boolean;
  finished_provisional: boolean;
  minutes: number;
  team_h: number;
  team_a: number;
  team_h_score: number | null;
  team_a_score: number | null;
  /** FPL's static preseason FDR. Replaced by our own rating (§7.2). */
  team_h_difficulty: number;
  team_a_difficulty: number;
  stats: FplFixtureStat[];
}

/* --- Manager (entry) endpoints ------------------------------------------ */

export interface FplEntry {
  id: number;
  name: string;
  player_first_name: string;
  player_last_name: string;
  summary_overall_points: number;
  summary_overall_rank: number | null;
  summary_event_points: number;
  summary_event_rank: number | null;
  current_event: number | null;
  last_deadline_bank: number | null;
  last_deadline_value: number | null;
  last_deadline_total_transfers: number | null;
}

export interface FplEntryHistoryEvent {
  event: number;
  points: number;
  total_points: number;
  rank: number | null;
  rank_sort: number | null;
  overall_rank: number | null;
  bank: number;
  value: number;
  event_transfers: number;
  event_transfers_cost: number;
  points_on_bench: number;
}

export interface FplEntryHistory {
  current: FplEntryHistoryEvent[];
  past: { season_name: string; total_points: number; rank: number }[];
  chips: { name: string; time: string; event: number }[];
}

export interface FplPick {
  element: number;
  position: number; // 1-11 starters, 12-15 bench (in order)
  multiplier: number; // 0 benched, 1 playing, 2 captain, 3 triple captain
  is_captain: boolean;
  is_vice_captain: boolean;
}

export interface FplEntryPicks {
  active_chip: string | null;
  automatic_subs: { element_in: number; element_out: number; event: number }[];
  entry_history: FplEntryHistoryEvent;
  picks: FplPick[];
}

export interface FplTransfer {
  element_in: number;
  element_in_cost: number;
  element_out: number;
  element_out_cost: number;
  entry: number;
  event: number;
  time: string;
}

/* --- Live gameweek ------------------------------------------------------- */

/**
 * `event/{gw}/live/` — every player's actual return for one gameweek.
 *
 * ~464KB per gameweek and only a fraction of it is used, so it is trimmed to
 * element id → points before anything caches it (`model/history.ts`).
 */
export interface FplLiveElement {
  id: number;
  stats: {
    minutes: number;
    total_points: number;
    bonus: number;
  };
}

export interface FplEventLive {
  elements: FplLiveElement[];
}

/* --- League endpoints ---------------------------------------------------- */

export interface FplLeagueStanding {
  id: number;
  entry: number;
  entry_name: string;
  player_name: string;
  rank: number;
  last_rank: number;
  rank_sort: number;
  event_total: number;
  total: number;
}

export interface FplClassicLeague {
  league: {
    id: number;
    name: string;
    created: string;
    closed: boolean;
    scoring: string;
    start_event: number;
  };
  standings: {
    has_next: boolean;
    page: number;
    results: FplLeagueStanding[];
  };
  new_entries: { has_next: boolean; page: number; results: unknown[] };
}

/* --- Per-player history -------------------------------------------------- */

export interface FplElementSummaryHistory {
  element: number;
  fixture: number;
  opponent_team: number;
  was_home: boolean;
  kickoff_time: string;
  total_points: number;
  round: number;
  minutes: number;
  goals_scored: number;
  assists: number;
  clean_sheets: number;
  goals_conceded: number;
  own_goals: number;
  penalties_saved: number;
  penalties_missed: number;
  yellow_cards: number;
  red_cards: number;
  saves: number;
  bonus: number;
  bps: number;
  starts: number;
  defensive_contribution: number;
  expected_goals: string;
  expected_assists: string;
  expected_goal_involvements: string;
  expected_goals_conceded: string;
  value: number;
  selected: number;
}

export interface FplElementSummary {
  fixtures: FplFixture[];
  history: FplElementSummaryHistory[];
  history_past: { season_name: string; total_points: number; minutes: number }[];
}
