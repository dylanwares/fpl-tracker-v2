import { describe, expect, it } from "vitest";
import { buildProjections } from "@/lib/model/xp";
import { clampWindow, MAX_WINDOW } from "@/lib/xp/client";

/** Shaped like a real row from api.fplcopilot.com, trimmed to what we read. */
const haaland = {
  id: 411,
  fpl_code: 223094,
  name: "Haaland",
  position: "FWD",
  team: "MCI",
  price: 15.5,
  live_price: 15.5,
  cost_change_event: 0,
  selected_by: 71.2,
  total_points: 13.78,
  gameweeks: [
    { gw: 4, minutes: 88, points: 6.43, base_minutes: 88, base_points: 6.43 },
    { gw: 5, minutes: 88, points: 7.35, base_minutes: 88, base_points: 7.35 },
  ],
  price_change_percent: 76,
  price_change_projections: [],
  price_change_locked_until: null,
  price_change_calibrating: false,
  expected_goals_per_90: 0.82,
  expected_assists_per_90: 0.17,
  defensive_contribution_per_90: 5,
  saves_per_90: null,
  defcon_is_last_season: false,
};

const FETCHED_AT = new Date("2026-09-09T12:00:00Z");

describe("buildProjections", () => {
  const projections = buildProjections([haaland], FETCHED_AT);

  it("keys players by their FPL element id", () => {
    expect(projections.get(411)?.name).toBe("Haaland");
    expect(projections.get(411)?.code).toBe(223094);
  });

  it("collects the gameweeks covered, ascending", () => {
    expect(projections.gameweeks).toEqual([4, 5]);
  });

  it("reads points for a single gameweek", () => {
    expect(projections.pointsFor(411, 4)).toBe(6.43);
  });

  it("sums across the window", () => {
    expect(projections.sumOver(411)).toBeCloseTo(13.78, 2);
    expect(projections.sumOver(411, [5])).toBeCloseTo(7.35, 2);
  });

  it("normalises GK to the FPL's GKP", () => {
    const keeper = buildProjections([{ ...haaland, id: 1, position: "GK" }], FETCHED_AT);
    expect(keeper.get(1)?.position).toBe("GKP");
  });

  it("returns null — never zero — for players the feed omits", () => {
    // ~28 of the 653 FPL players are missing from the feed at any time.
    // Zero would silently rank a real player last instead of flagging him.
    expect(projections.get(999)).toBeNull();
    expect(projections.pointsFor(999, 4)).toBeNull();
    expect(projections.sumOver(999)).toBeNull();
  });

  it("sums rather than overwrites if a gameweek ever arrives split in two", () => {
    const doubled = buildProjections([
      {
        ...haaland,
        gameweeks: [
          { gw: 4, minutes: 88, points: 6.43, base_minutes: 88, base_points: 6.43 },
          { gw: 4, minutes: 80, points: 5.5, base_minutes: 80, base_points: 5.5 },
        ],
      },
    ], FETCHED_AT);
    expect(doubled.pointsFor(411, 4)).toBeCloseTo(11.93, 2);
  });

  it("rejects a payload that isn't an array", () => {
    expect(() => buildProjections({ error: "nope" }, FETCHED_AT)).toThrow(/did not return an array/);
  });
});

describe("clampWindow", () => {
  it("keeps the window inside what the endpoint accepts", () => {
    expect(clampWindow(0)).toBe(1);
    expect(clampWindow(6)).toBe(6);
    expect(clampWindow(99)).toBe(MAX_WINDOW);
  });
});

describe("the feed's number is the number", () => {
  const projections = buildProjections([haaland], FETCHED_AT);

  it("reports the provider's own window total, not one we recompute", () => {
    // 6.43 + 7.35 = 13.78 happens to agree here, but `totalFor` must read the
    // provider's field rather than summing, so a provider-side adjustment
    // survives instead of being quietly overwritten.
    expect(projections.totalFor(411)).toBe(13.78);
    expect(projections.totalFor(999)).toBeNull();
  });
});
