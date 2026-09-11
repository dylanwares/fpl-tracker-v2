/**
 * The player sheet's form strip — pure shaping, no data loading.
 *
 * Split from `detail.ts` for the reason in CLAUDE.md: that module reaches for
 * `use cache` loaders, so anything a test (or a client component) wants to use
 * at runtime has to live away from it.
 *
 * The strip is two rows of the same shape, past above future, so the two can be
 * read against each other on one scale. That symmetry is the whole design, and
 * it is why a gameweek — not a match — is the column: the upcoming row is
 * priced per gameweek by the xP feed, so the past row is summed per gameweek to
 * match.
 */
import type { Rag } from "@/components/ui/rag";
import type { Difficulty } from "@/components/ui/fixture-cell";

export interface DetailMatch {
  opponent: string;
  opponentName: string;
  isHome: boolean;
  difficulty: Difficulty;
}

export interface DetailGameweek {
  /**
   * Null in a padding slot: the strip is always `PAST_COLUMNS` wide, so early
   * in the season the past row is left-padded with gameweeks that don't exist.
   */
  gameweek: number | null;
  /** Empty on a blank gameweek; two entries on a double. */
  matches: DetailMatch[];
  /**
   * Points scored (past row) or projected (upcoming row). Null when the
   * gameweek is blank, padded, or the player isn't covered by the xP feed.
   */
  points: number | null;
  rag: Rag;
  /** Past row only — null upcoming. Minutes of 0 means he didn't feature. */
  minutes: number | null;
  /** Past row only: expected goals across the gameweek's match or matches. */
  xg: number | null;
  /** Past row only: saves, which is the number that matters for a keeper. */
  saves: number | null;
}

/** What `summariseGameweek` needs from a played match. */
export interface PlayedMatch {
  gameweek: number;
  minutes: number;
  points: number;
  xg: number;
  saves: number;
}

/** Columns in the past row. Five, padded, whatever the season has played. */
export const PAST_COLUMNS = 5;

/**
 * One past column: what the player actually returned that gameweek.
 *
 * A double is summed rather than split — a gameweek is the unit the upcoming
 * row is priced in. Nothing here is derived; points, minutes and xG are the
 * API's own numbers.
 *
 * Minutes of zero is rated `none`, not red. Red means "played and returned
 * nothing"; grey means "wasn't on the pitch". Collapsing the two would hide the
 * one thing you most want from a form strip.
 */
export function summariseGameweek(
  gameweek: number,
  matches: DetailMatch[],
  played: PlayedMatch[],
  rate: (points: number | null) => Rag,
): DetailGameweek {
  const blank: DetailGameweek = {
    gameweek,
    matches,
    points: null,
    rag: "none",
    minutes: null,
    xg: null,
    saves: null,
  };

  // No fixture at all — a blank, which the cell renders as a hatch.
  if (matches.length === 0) return blank;

  // The team played but the player has no row: he wasn't registered yet. FPL
  // does publish a row for an unused substitute, so this is genuinely "no
  // record" rather than "didn't get off the bench".
  const rows = played.filter((row) => row.gameweek === gameweek);
  if (rows.length === 0) return blank;

  const sum = (pick: (row: PlayedMatch) => number) =>
    rows.reduce((total, row) => total + pick(row), 0);

  const minutes = sum((row) => row.minutes);
  const points = sum((row) => row.points);

  return {
    gameweek,
    matches,
    points,
    rag: minutes === 0 ? "none" : rate(points),
    minutes,
    xg: sum((row) => row.xg),
    saves: sum((row) => row.saves),
  };
}

/** Pad the past row to a fixed width so the two rows line up column for column. */
export function padLeft(columns: DetailGameweek[], width = PAST_COLUMNS): DetailGameweek[] {
  const padding: DetailGameweek = {
    gameweek: null,
    matches: [],
    points: null,
    rag: "none",
    minutes: null,
    xg: null,
    saves: null,
  };
  return [...Array<DetailGameweek>(Math.max(0, width - columns.length)).fill(padding), ...columns];
}
