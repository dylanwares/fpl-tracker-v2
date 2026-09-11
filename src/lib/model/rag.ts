/**
 * RAG scoring (product spec §2.2, §2.3).
 *
 * Each of the three metrics is scored independently against the player's
 * *positional peer group*, and the peer group is filtered by minutes. That
 * filter is the whole trick: include every squad filler who has never played
 * and the positional average collapses, every owned player looks green, and the
 * page tells you nothing.
 *
 * Terciles, not fixed thresholds — "top third of Premier League midfielders who
 * actually play" survives a season where scoring drifts, and a hard-coded
 * "15 points is green" does not.
 */
import { config } from "@/lib/config";
import type { Rag } from "@/components/ui/rag";
import type { PlayerPool, PooledPlayer } from "./pool";
import type { Position } from "./xp";

export type MetricKey = "points" | "value" | "expected";

export interface MetricScore {
  rag: Rag;
  /** The player's own figure, or null when he has no projection. */
  value: number | null;
  /** The peer-group mean, for the "vs average" line. */
  peerAverage: number | null;
}

export interface PlayerRating {
  points: MetricScore;
  value: MetricScore;
  expected: MetricScore;
  overall: Rag;
  /** True when he hasn't played enough for the points metrics to mean anything. */
  insufficientMinutes: boolean;
  peerSize: number;
}

interface Terciles {
  lower: number;
  upper: number;
  mean: number;
}

/** Null when the peer group can't support meaningful thirds. */
function tercilesOf(values: number[]): Terciles | null {
  if (values.length < 6) return null;

  const sorted = [...values].sort((a, b) => a - b);
  const at = (fraction: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(fraction * sorted.length))];

  const lower = at(1 / 3);
  const upper = at(2 / 3);

  // No spread means no thirds. Without this every member of a flat peer group
  // clears the top boundary and the whole group comes back green, which reads
  // as "all excellent" when it means "indistinguishable".
  if (lower === upper) return null;

  return {
    lower,
    upper,
    mean: sorted.reduce((total, value) => total + value, 0) / sorted.length,
  };
}

function score(value: number | null, terciles: Terciles | null): Rag {
  if (value === null || terciles === null) return "none";
  if (value >= terciles.upper) return "green";
  if (value >= terciles.lower) return "amber";
  return "red";
}

interface PositionBands {
  points: Terciles | null;
  value: Terciles | null;
  expected: Terciles | null;
  /** Single-gameweek xP across every projected player, for rating a forecast. */
  perGameweek: Terciles | null;
  /** The same, across regular starters only, for rating a result. */
  perStarterGameweek: Terciles | null;
  size: number;
}

export interface RagScorer {
  rate(entry: PooledPlayer): PlayerRating;
  /**
   * Rate one gameweek's projected points against what a player in this
   * position typically scores in a single gameweek — so a 6.2 reads as a good
   * week for a defender and an ordinary one for a premium forward.
   */
  rateGameweek(position: Position, points: number | null): Rag;
  /**
   * Rate points a player actually scored in a gameweek against what a regular
   * starter in this position is expected to return.
   *
   * Deliberately a different peer group from `rateGameweek`. Rating a result is
   * a different question from rating a forecast, and the unfiltered band is too
   * generous for it: across every projected player the thirds sit around 0.3
   * and 2.0, so a two-point blank comes back green. Across players who actually
   * start they sit around 2.7 and 3.5, which calls a blank a blank. This is the
   * same minutes filter the record metrics in `rate()` already use.
   */
  rateReturn(position: Position, points: number | null): Rag;
}

/**
 * Build the peer groups once per render, then rate players against them.
 *
 * The xP band is built from projected players only — an unprojected player is
 * absent from the comparison rather than sitting in it as a zero and dragging
 * the thirds down (product spec §7.2).
 */
export function buildRagScorer(pool: PlayerPool): RagScorer {
  const bands = new Map<Position, PositionBands>();

  for (const position of ["GKP", "DEF", "MID", "FWD"] as const) {
    const peers = pool.players.filter(
      (entry) =>
        entry.player.position === position &&
        entry.player.minutesShare >= config.minutesThreshold,
    );

    // Per-gameweek band is drawn from every projected player in the position,
    // not just the minutes-filtered peers: it rates a forecast, and the pool of
    // forecasts is the right comparison.
    const perGameweekValues: number[] = [];
    for (const entry of pool.players) {
      if (entry.player.position !== position || entry.projection === null) continue;
      for (const week of entry.projection.byGameweek.values()) {
        perGameweekValues.push(week.points);
      }
    }

    // The starters-only version of the same band, for rating results.
    const starterGameweekValues: number[] = [];
    for (const entry of peers) {
      if (entry.projection === null) continue;
      for (const week of entry.projection.byGameweek.values()) {
        starterGameweekValues.push(week.points);
      }
    }

    bands.set(position, {
      points: tercilesOf(peers.map((entry) => entry.player.totalPoints)),
      value: tercilesOf(peers.map((entry) => entry.player.pointsPerMillion)),
      expected: tercilesOf(
        peers
          .map((entry) => entry.xpHorizon)
          .filter((points): points is number => points !== null),
      ),
      perGameweek: tercilesOf(perGameweekValues),
      perStarterGameweek: tercilesOf(starterGameweekValues),
      size: peers.length,
    });
  }

  return {
    rateGameweek(position: Position, points: number | null): Rag {
      return score(points, bands.get(position)?.perGameweek ?? null);
    },

    rateReturn(position: Position, points: number | null): Rag {
      return score(points, bands.get(position)?.perStarterGameweek ?? null);
    },

    rate(entry: PooledPlayer): PlayerRating {
      const band = bands.get(entry.player.position);
      const insufficientMinutes = entry.player.minutesShare < config.minutesThreshold;

      // Points and points-per-£m are meaningless for someone who hasn't played,
      // and a red here would read as "bad" when it means "unknown". xP still
      // scores — it is a forecast, not a record (product spec §2.3).
      const points: MetricScore = {
        rag: insufficientMinutes ? "none" : score(entry.player.totalPoints, band?.points ?? null),
        value: entry.player.totalPoints,
        peerAverage: band?.points?.mean ?? null,
      };

      const value: MetricScore = {
        rag: insufficientMinutes
          ? "none"
          : score(entry.player.pointsPerMillion, band?.value ?? null),
        value: entry.player.pointsPerMillion,
        peerAverage: band?.value?.mean ?? null,
      };

      const expected: MetricScore = {
        rag: score(entry.xpHorizon, band?.expected ?? null),
        value: entry.xpHorizon,
        peerAverage: band?.expected?.mean ?? null,
      };

      return {
        points,
        value,
        expected,
        overall: overallRag([points.rag, value.rag, expected.rag]),
        insufficientMinutes,
        peerSize: band?.size ?? 0,
      };
    },
  };
}

/**
 * Green if two or more are green and none are red; red if two or more are red;
 * amber otherwise. Unrated metrics don't count either way, and a player with
 * fewer than two rated metrics gets no overall rating at all rather than one
 * built on a single number.
 */
export function overallRag(ratings: Rag[]): Rag {
  const rated = ratings.filter((rag) => rag !== "none");
  if (rated.length < 2) return "none";

  const greens = rated.filter((rag) => rag === "green").length;
  const reds = rated.filter((rag) => rag === "red").length;

  if (greens >= 2 && reds === 0) return "green";
  if (reds >= 2) return "red";
  return "amber";
}

/** "+18 pts" against the peer average, or null when there's nothing to compare. */
export function deltaToPeers(metric: MetricScore): number | null {
  if (metric.value === null || metric.peerAverage === null) return null;
  return metric.value - metric.peerAverage;
}
