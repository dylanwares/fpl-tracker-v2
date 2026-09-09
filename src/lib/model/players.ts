/**
 * Player normalisation.
 *
 * `bootstrap-static` returns ~90 fields per element and a lot of them are
 * numeric-looking strings. This is the one place that parses them, so nothing
 * downstream ever calls `num()` on an API field or divides a price by 10.
 *
 * Expected points are NOT here — they come from the FPL Copilot feed and are
 * joined on in `pool.ts`. A player's xP is never derived from anything in this
 * file.
 */
import type { ElementTypeId, FplElement, PlayerStatus } from "@/lib/fpl/types";
import { num } from "@/lib/utils";
import type { Position } from "./xp";

/** What the badge on a player row says. */
export type Availability = "available" | "doubtful" | "out";

export const positionByElementType: Record<ElementTypeId, Position> = {
  1: "GKP",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

export interface Player {
  id: number;
  /** Stable across seasons — the key for photo assets. */
  code: number;
  name: string;
  fullName: string;
  teamId: number;
  position: Position;

  /** In millions, e.g. 6.5 — already divided by 10. */
  price: number;
  /** Price movement this gameweek, in millions. */
  priceChangeEvent: number;
  selectedBy: number;

  availability: Availability;
  status: PlayerStatus;
  /** 0–100, or null when FPL hasn't said. */
  chanceOfPlaying: number | null;
  news: string;

  totalPoints: number;
  eventPoints: number;
  pointsPerGame: number;
  form: number;
  /** Season points per million of current price — the value metric (§2.2). */
  pointsPerMillion: number;

  minutes: number;
  starts: number;
  /**
   * Share of the minutes actually available to him so far, 0–1. Below the
   * threshold in `config.minutesThreshold` a player is excluded from RAG peer
   * groups rather than dragging the average down.
   */
  minutesShare: number;

  goals: number;
  assists: number;
  cleanSheets: number;
  bonus: number;
  bps: number;
  defensiveContribution: number;

  /** Season totals. Individual xG, so summing a team's players gives team xG. */
  expectedGoals: number;
  /** Team xG conceded while this player was on the pitch — not additive. */
  expectedGoalsConceded: number;

  per90: {
    xg: number;
    xa: number;
    xgi: number;
    xgc: number;
    defcon: number;
    saves: number;
    starts: number;
  };
}

function availabilityOf(element: FplElement): Availability {
  // `chance_of_playing_next_round` is the more current signal — FPL leaves
  // `status` at "a" for a player it has already flagged as 75%.
  const chance = element.chance_of_playing_next_round;
  if (chance !== null && chance <= 25) return "out";
  if (chance !== null && chance < 100) return "doubtful";

  switch (element.status) {
    case "a":
      return "available";
    case "d":
      return "doubtful";
    default:
      return "out";
  }
}

/**
 * @param availableMinutes total minutes played by the league so far
 *   (finished gameweeks × 90), used for `minutesShare`.
 */
export function buildPlayers(raw: FplElement[], availableMinutes: number): Player[] {
  return raw.map((element) => {
    const price = element.now_cost / 10;
    const totalPoints = element.total_points;

    return {
      id: element.id,
      code: element.code,
      name: element.web_name,
      fullName: `${element.first_name} ${element.second_name}`.trim(),
      teamId: element.team,
      position: positionByElementType[element.element_type],

      price,
      priceChangeEvent: element.cost_change_event / 10,
      selectedBy: num(element.selected_by_percent),

      availability: availabilityOf(element),
      status: element.status,
      chanceOfPlaying: element.chance_of_playing_next_round,
      news: element.news,

      totalPoints,
      eventPoints: element.event_points,
      pointsPerGame: num(element.points_per_game),
      form: num(element.form),
      pointsPerMillion: price > 0 ? totalPoints / price : 0,

      minutes: element.minutes,
      starts: element.starts,
      minutesShare: availableMinutes > 0 ? element.minutes / availableMinutes : 0,

      goals: element.goals_scored,
      assists: element.assists,
      cleanSheets: element.clean_sheets,
      bonus: element.bonus,
      bps: element.bps,
      defensiveContribution: element.defensive_contribution,

      expectedGoals: num(element.expected_goals),
      expectedGoalsConceded: num(element.expected_goals_conceded),

      per90: {
        xg: element.expected_goals_per_90,
        xa: element.expected_assists_per_90,
        xgi: element.expected_goal_involvements_per_90,
        xgc: element.expected_goals_conceded_per_90,
        defcon: element.defensive_contribution_per_90,
        saves: element.saves_per_90,
        starts: element.starts_per_90,
      },
    };
  });
}

export function playersById(players: Player[]): Map<number, Player> {
  return new Map(players.map((player) => [player.id, player]));
}
