/**
 * The fixture ticker (product spec §6.1) and the combined rating (§6.3).
 *
 * Scoring is deliberately not "average difficulty". A gameweek is worth
 * `Σ (6 − difficulty)` across the matches in it, which gives:
 *
 * - a blank **0** — you score nothing that week, and averaging difficulty would
 *   have quietly ignored that;
 * - a single very easy fixture **5**, a very hard one **1**;
 * - a double **the sum of both**, so two middling fixtures (6) beat one easy
 *   one (5), which is the actual decision a manager makes.
 *
 * Higher is always better, and the same number works for sorting the grid and
 * for feeding the combined rating.
 */
import type { Difficulty } from "@/components/ui/fixture-cell";
import type { TeamForm } from "./form";
import { zScores } from "./form";
import type { Team } from "./teams";

export interface TickerMatch {
  opponent: string;
  opponentName: string;
  isHome: boolean;
  difficulty: Difficulty;
}

export interface TickerCell {
  gameweek: number;
  /** Empty on a blank, two entries on a double. */
  matches: TickerMatch[];
}

export interface TickerRow {
  team: Team;
  cells: TickerCell[];
  form: TeamForm;
}

/** Higher is better. A blank scores 0, a double scores both fixtures. */
export function fixtureValue(cell: TickerCell): number {
  return cell.matches.reduce((total, match) => total + (6 - match.difficulty), 0);
}

/** Mean fixture value per gameweek over the first `horizon` cells. */
export function runValue(row: TickerRow, horizon: number): number {
  const cells = row.cells.slice(0, horizon);
  if (cells.length === 0) return 0;
  return cells.reduce((total, cell) => total + fixtureValue(cell), 0) / cells.length;
}

export type RatingKey = "fixtures" | "attack" | "defence";

export interface RatedRow {
  row: TickerRow;
  runValue: number;
  /** Z-scores across the 20 teams, so the three are comparable. */
  fixtureZ: number;
  attackZ: number;
  defenceZ: number;
  /** Form and fixtures combined — the number the page exists for. */
  attackRating: number;
  defenceRating: number;
}

/**
 * Form is weighted below fixtures: fixtures are forward-looking and fixed,
 * while form partially regresses. Product spec §6.3.
 */
const FORM_WEIGHT = 0.4;
const FIXTURE_WEIGHT = 0.6;

export function rateRows(rows: TickerRow[], horizon: number): RatedRow[] {
  const runValues = rows.map((row) => runValue(row, horizon));

  // Attack: goals scored per game. Defence: goals conceded per game, negated so
  // that a higher z-score always means "better", as it does everywhere else.
  const attack = zScores(rows.map((row) => row.form.goalsForPerGame));
  const defence = zScores(rows.map((row) => -row.form.goalsAgainstPerGame));
  const fixtures = zScores(runValues);

  return rows.map((row, index) => ({
    row,
    runValue: runValues[index],
    fixtureZ: fixtures[index],
    attackZ: attack[index],
    defenceZ: defence[index],
    attackRating: FORM_WEIGHT * attack[index] + FIXTURE_WEIGHT * fixtures[index],
    defenceRating: FORM_WEIGHT * defence[index] + FIXTURE_WEIGHT * fixtures[index],
  }));
}

export function sortRated(rated: RatedRow[], key: RatingKey | "name"): RatedRow[] {
  const sorted = [...rated];
  switch (key) {
    case "fixtures":
      return sorted.sort((a, b) => b.runValue - a.runValue);
    case "attack":
      return sorted.sort((a, b) => b.attackRating - a.attackRating);
    case "defence":
      return sorted.sort((a, b) => b.defenceRating - a.defenceRating);
    case "name":
      return sorted.sort((a, b) => a.row.team.name.localeCompare(b.row.team.name));
  }
}

/** The horizons offered in the ticker's sort control (design spec §6.6). */
export const HORIZONS = [3, 5, 8] as const;
export const MAX_HORIZON = 8;
