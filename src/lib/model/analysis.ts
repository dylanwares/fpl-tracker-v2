/**
 * Analysis (product spec §4) — decision quality, not raw points.
 *
 * Pure module: types and arithmetic only, no server imports, because the charts
 * that consume these shapes are client components.
 *
 * **What is deliberately not here.** The spec asks for captaincy compared
 * against an "always captain the highest xP" baseline. That needs the
 * projection as it stood before the deadline, and the feed re-projects the past,
 * so the number cannot be recovered — see product spec §7.4. The "highest
 * owned" baseline is left out for a related reason: FPL publishes only current
 * ownership, so judging a GW1 decision by today's figures is hindsight wearing
 * a process metric's clothes.
 *
 * Cause attribution for bench points is also absent. Telling rotation from
 * injury needs a player's status *that week*, which the API doesn't keep.
 */

export interface CaptainPick {
  elementId: number | null;
  name: string;
  /** The player's own return, before any multiplier. */
  points: number;
}

export interface GameweekAnalysis {
  gameweek: number;
  /** Gross gameweek score, before any transfer hit. */
  points: number;
  /**
   * Points after hits — what the standings actually count.
   *
   * `entry/{id}/history/` reports `points` gross of hits while the league table
   * reports totals net of them, so a manager who took a −4 appears to have
   * scored four more than his rank reflects. Every comparison here uses the net
   * figure, so the margins on this page reconcile with the gaps on the League
   * page.
   */
  netPoints: number;
  benchPoints: number;
  transfers: number;
  transferCost: number;
  overallRank: number | null;
  /** The whole game's average score for the gameweek. */
  gameAverage: number;
  leagueAverage: number | null;
  chip: string | null;
  /** Extra points the chip earned, where that is measurable. */
  chipGain: number | null;

  captain: CaptainPick;
  /** The best captain available from the starting XI, in hindsight. */
  best: CaptainPick;
  multiplier: number;
  /** `(best − actual) × multiplier` — what the choice cost. */
  captaincyLoss: number;

  autoSubs: { inName: string; outName: string; gained: number }[];
  /** The highest-scoring player left on the bench, where one scored. */
  benchRegret: { name: string; points: number } | null;
}

export interface TransferAnalysis {
  gameweek: number;
  inId: number;
  outId: number;
  inName: string;
  outName: string;
  /** Points scored since the transfer, by each player. */
  pointsIn: number;
  pointsOut: number;
  cost: number;
  /** `in − out − cost`. Negative means the move has lost points so far. */
  net: number;
}

export interface AnalysisTotals {
  points: number;
  benchPoints: number;
  captaincyLoss: number;
  transferNet: number;
  hits: number;
  hitCost: number;
  vsGameAverage: number;
  vsLeagueAverage: number | null;
}

export interface AnalysisView {
  gameweeks: GameweekAnalysis[];
  transfers: TransferAnalysis[];
  totals: AnalysisTotals;
  best: GameweekAnalysis | null;
  worst: GameweekAnalysis | null;
  /** True while there is too little season to read anything into. */
  isEarly: boolean;
}

/** Below this many gameweeks the page reports numbers but claims no trend. */
export const TREND_THRESHOLD = 6;

export function summarise(
  gameweeks: GameweekAnalysis[],
  transfers: TransferAnalysis[],
): AnalysisTotals {
  const hits = gameweeks.filter((week) => week.transferCost > 0);

  let vsLeague: number | null = 0;
  for (const week of gameweeks) {
    if (week.leagueAverage === null) {
      vsLeague = null;
      break;
    }
    vsLeague += week.netPoints - week.leagueAverage;
  }

  return {
    points: gameweeks.reduce((total, week) => total + week.netPoints, 0),
    benchPoints: gameweeks.reduce((total, week) => total + week.benchPoints, 0),
    captaincyLoss: gameweeks.reduce((total, week) => total + week.captaincyLoss, 0),
    transferNet: transfers.reduce((total, transfer) => total + transfer.net, 0),
    hits: hits.length,
    hitCost: hits.reduce((total, week) => total + week.transferCost, 0),
    vsGameAverage: gameweeks.reduce(
      (total, week) => total + (week.netPoints - week.gameAverage),
      0,
    ),
    vsLeagueAverage: vsLeague,
  };
}

/**
 * A chip's return, where it is measurable.
 *
 * Triple Captain is worth one extra multiple of the captain's return; Bench
 * Boost is worth exactly what the bench scored. Wildcard and Free Hit reshape a
 * whole squad, so there is no counterfactual to measure them against and this
 * returns null rather than a fabricated number.
 */
export function chipGain(
  chip: string | null,
  captainPoints: number,
  benchPoints: number,
): number | null {
  switch (chip) {
    case "3xc":
      return captainPoints;
    case "bboost":
      return benchPoints;
    default:
      return null;
  }
}

/** Running total, for the cumulative charts. */
export function cumulative(values: number[]): number[] {
  let total = 0;
  return values.map((value) => (total += value));
}
