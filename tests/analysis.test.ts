import { describe, expect, it } from "vitest";
import {
  chipGain,
  cumulative,
  summarise,
  type GameweekAnalysis,
  type TransferAnalysis,
} from "@/lib/model/analysis";

function week(overrides: Partial<GameweekAnalysis> = {}): GameweekAnalysis {
  return {
    gameweek: 1,
    points: 60,
    netPoints: 60,
    benchPoints: 4,
    transfers: 0,
    transferCost: 0,
    overallRank: 100000,
    gameAverage: 50,
    leagueAverage: 55,
    chip: null,
    chipGain: null,
    captain: { elementId: 1, name: "A", points: 6 },
    best: { elementId: 2, name: "B", points: 10 },
    multiplier: 2,
    captaincyLoss: 8,
    autoSubs: [],
    benchRegret: null,
    ...overrides,
  };
}

function transfer(overrides: Partial<TransferAnalysis> = {}): TransferAnalysis {
  return {
    gameweek: 3,
    inId: 1,
    outId: 2,
    inName: "In",
    outName: "Out",
    pointsIn: 10,
    pointsOut: 4,
    cost: 0,
    net: 6,
    ...overrides,
  };
}

describe("summarise", () => {
  it("totals the net score, so a hit is not counted as points scored", () => {
    const totals = summarise([week({ points: 60, netPoints: 56, transferCost: 4 })], []);
    expect(totals.points).toBe(56);
  });

  it("totals points, bench and captaincy loss", () => {
    const totals = summarise(
      [week(), week({ gameweek: 2, points: 40, netPoints: 40 })],
      [],
    );
    expect(totals.points).toBe(100);
    expect(totals.benchPoints).toBe(8);
    expect(totals.captaincyLoss).toBe(16);
  });

  it("measures the margin over the game average across the season", () => {
    const totals = summarise(
      [
        week({ netPoints: 60, gameAverage: 50 }),
        week({ netPoints: 40, gameAverage: 50 }),
      ],
      [],
    );
    expect(totals.vsGameAverage).toBe(0);
  });

  it("counts hits and their cost separately from transfer return", () => {
    const totals = summarise(
      [week({ transferCost: 4 }), week({ gameweek: 2, transferCost: 0 })],
      [transfer({ cost: 4, net: 2 })],
    );
    expect(totals.hits).toBe(1);
    expect(totals.hitCost).toBe(4);
    expect(totals.transferNet).toBe(2);
  });

  it("gives up on the league margin rather than guessing a missing week", () => {
    const totals = summarise([week(), week({ gameweek: 2, leagueAverage: null })], []);
    expect(totals.vsLeagueAverage).toBeNull();
  });

  it("measures the league margin when every week is present", () => {
    const totals = summarise(
      [
        week({ netPoints: 60, leagueAverage: 55 }),
        week({ netPoints: 50, leagueAverage: 55 }),
      ],
      [],
    );
    expect(totals.vsLeagueAverage).toBe(0);
  });
});

describe("chipGain", () => {
  it("credits a Triple Captain with one extra multiple of the captain", () => {
    expect(chipGain("3xc", 9, 5)).toBe(9);
  });

  it("credits a Bench Boost with what the bench scored", () => {
    expect(chipGain("bboost", 9, 17)).toBe(17);
  });

  it("refuses to invent a figure for a Wildcard", () => {
    expect(chipGain("wildcard", 9, 5)).toBeNull();
    expect(chipGain("freehit", 9, 5)).toBeNull();
  });

  it("is null when no chip was played", () => {
    expect(chipGain(null, 9, 5)).toBeNull();
  });
});

describe("cumulative", () => {
  it("runs a total across the series", () => {
    expect(cumulative([1, 2, 3])).toEqual([1, 3, 6]);
  });

  it("handles an empty series", () => {
    expect(cumulative([])).toEqual([]);
  });
});
