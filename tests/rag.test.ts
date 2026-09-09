import { describe, expect, it } from "vitest";
import { buildRagScorer, deltaToPeers, overallRag } from "@/lib/model/rag";
import type { PlayerPool, PooledPlayer } from "@/lib/model/pool";
import type { Position } from "@/lib/model/xp";

/** Enough of a pooled player for the scorer; it only reads these fields. */
function pooled(
  id: number,
  position: Position,
  totalPoints: number,
  pointsPerMillion: number,
  xpHorizon: number | null,
  minutesShare = 1,
): PooledPlayer {
  return {
    player: { id, position, totalPoints, pointsPerMillion, minutesShare },
    team: null,
    projection: null,
    isProjected: xpHorizon !== null,
    xpNext: null,
    xpHorizon,
  } as unknown as PooledPlayer;
}

/** Nine midfielders, evenly spread, so the thirds are unambiguous. */
function poolOf(players: PooledPlayer[]): PlayerPool {
  return {
    players,
    gameweeks: [4, 5, 6],
    planningGameweek: 4,
    projectionsAvailable: true,
    unprojectedCount: players.filter((entry) => !entry.isProjected).length,
  };
}

const spread = Array.from({ length: 9 }, (_, index) =>
  pooled(index + 1, "MID", (index + 1) * 10, index + 1, (index + 1) * 5),
);

describe("buildRagScorer", () => {
  const scorer = buildRagScorer(poolOf(spread));

  it("puts the top third of the peer group in green", () => {
    expect(scorer.rate(spread[8]).points.rag).toBe("green");
  });

  it("puts the bottom third in red", () => {
    expect(scorer.rate(spread[0]).points.rag).toBe("red");
  });

  it("puts the middle third in amber", () => {
    expect(scorer.rate(spread[4]).points.rag).toBe("amber");
  });

  it("reports the peer average so a row can show a delta", () => {
    const rating = scorer.rate(spread[8]);
    expect(rating.points.peerAverage).toBe(50);
    expect(deltaToPeers(rating.points)).toBe(40);
  });

  it("compares within position, not across the whole pool", () => {
    // Six forwards on numbers that would be bottom-third among the midfielders.
    // The best of them is green, because he is judged against forwards.
    const forwards = Array.from({ length: 6 }, (_, i) => pooled(100 + i, "FWD", i + 1, i + 1, i + 1));
    const withForwards = buildRagScorer(poolOf([...spread, ...forwards]));

    expect(withForwards.rate(forwards[5]).points.rag).toBe("green");
    expect(withForwards.rate(spread[8]).points.rag).toBe("green");
  });

  it("leaves a peer group too small for thirds unrated", () => {
    const four = Array.from({ length: 4 }, (_, i) => pooled(200 + i, "GKP", i + 1, i + 1, i + 1));
    expect(buildRagScorer(poolOf(four)).rate(four[3]).points.rag).toBe("none");
  });

  it("refuses to rate a peer group with no spread, rather than calling it all green", () => {
    const flat = Array.from({ length: 8 }, (_, i) => pooled(300 + i, "GKP", 10, 2, 10));
    const rating = buildRagScorer(poolOf(flat)).rate(flat[0]);
    expect(rating.points.rag).toBe("none");
    expect(rating.overall).toBe("none");
  });

  describe("minutes filter", () => {
    const bench = pooled(99, "MID", 0, 0, 20, 0.1);
    const scorerWithBench = buildRagScorer(poolOf([...spread, bench]));

    it("does not rate points for a player who barely plays", () => {
      const rating = scorerWithBench.rate(bench);
      expect(rating.insufficientMinutes).toBe(true);
      expect(rating.points.rag).toBe("none");
      expect(rating.value.rag).toBe("none");
    });

    it("still rates his expected points — a forecast, not a record", () => {
      const rating = scorerWithBench.rate(bench);
      expect(rating.expected.rag).not.toBe("none");
      expect(rating.expected.value).toBe(20);
    });

    it("keeps him out of everyone else's peer group", () => {
      // The 0-point player would drag the mean down if he were included.
      expect(scorerWithBench.rate(spread[8]).points.peerAverage).toBe(50);
    });
  });

  describe("unprojected players", () => {
    const noProjection = pooled(98, "MID", 55, 5, null);
    const scorerWithGap = buildRagScorer(poolOf([...spread, noProjection]));

    it("leaves expected points unrated rather than red", () => {
      expect(scorerWithGap.rate(noProjection).expected.rag).toBe("none");
    });

    it("excludes them from the xP band instead of counting them as zero", () => {
      // Band built from the nine real values, so the top is still green.
      expect(scorerWithGap.rate(spread[8]).expected.rag).toBe("green");
    });

    it("can still give an overall rating from the two metrics that work", () => {
      expect(scorerWithGap.rate(noProjection).overall).not.toBe("none");
    });
  });
});

describe("overallRag", () => {
  it("is green on two greens and no red", () => {
    expect(overallRag(["green", "green", "amber"])).toBe("green");
  });

  it("is not green if anything is red", () => {
    expect(overallRag(["green", "green", "red"])).toBe("amber");
  });

  it("is red on two reds", () => {
    expect(overallRag(["red", "red", "green"])).toBe("red");
  });

  it("is amber in the middle", () => {
    expect(overallRag(["amber", "amber", "amber"])).toBe("amber");
  });

  it("refuses to rate on a single metric", () => {
    expect(overallRag(["green", "none", "none"])).toBe("none");
  });

  it("ignores unrated metrics rather than counting them against a player", () => {
    expect(overallRag(["green", "green", "none"])).toBe("green");
  });
});
