import { describe, expect, it } from "vitest";
import type { FplChip } from "@/lib/fpl/types";
import { buildExposures, chipWindowsFor, type LeagueManager } from "@/lib/model/league";
import type { PooledPlayer } from "@/lib/model/pool";
import type { SquadPick } from "@/lib/model/squad";

function pick(id: number, xp: number | null, isCaptain = false): SquadPick {
  return {
    entry: {
      player: { id, name: `P${id}` },
      xpNext: xp,
      xpHorizon: xp,
    } as unknown as PooledPlayer,
    position: 1,
    isStarter: true,
    isCaptain,
    isViceCaptain: false,
    multiplier: isCaptain ? 2 : 1,
  };
}

function manager(entryId: number, starters: SquadPick[], name = `M${entryId}`): LeagueManager {
  return { entryId, managerName: name, starters } as LeagueManager;
}

describe("buildExposures", () => {
  it("counts a captain twice, so effective ownership can exceed 100%", () => {
    const managers = [
      manager(1, [pick(10, 5, true)]),
      manager(2, [pick(10, 5, true)]),
    ];
    const [row] = buildExposures(managers, 1);
    expect(row.starters).toBe(2);
    expect(row.captains).toBe(2);
    expect(row.effectiveOwnership).toBe(2);
  });

  it("ignores benched players — they are owned but score for nobody", () => {
    const withBench = manager(1, [pick(10, 5)]);
    // A second player, owned but benched, must not appear in the exposures.
    (withBench as { bench: SquadPick[] }).bench = [
      { ...pick(99, 9), isStarter: false, position: 12 },
    ];

    const rows = buildExposures([withBench, manager(2, [pick(10, 5)])], 1);
    expect(rows.map((row) => row.entry.player.id)).toEqual([10]);
    expect(rows[0].effectiveOwnership).toBe(1);
  });

  it("is positive when I have more exposure than the league", () => {
    const managers = [
      manager(1, [pick(10, 10, true)]),
      manager(2, [pick(20, 10)]),
      manager(3, [pick(20, 10)]),
    ];
    const mine = buildExposures(managers, 1).find((row) => row.entry.player.id === 10);
    // I captain him (2), nobody else starts him: EO = 2/3.
    expect(mine?.myExposure).toBe(2);
    expect(mine?.swingHorizon).toBeCloseTo(10 * (2 - 2 / 3));
  });

  it("is negative for a player the league starts and I don't", () => {
    const managers = [
      manager(1, [pick(10, 4)]),
      manager(2, [pick(20, 8)]),
      manager(3, [pick(20, 8)]),
    ];
    const threat = buildExposures(managers, 1).find((row) => row.entry.player.id === 20);
    expect(threat?.ownedByMe).toBe(false);
    expect(threat?.swingHorizon).toBeLessThan(0);
  });

  it("leaves swing null for an unprojected player rather than scoring him zero", () => {
    const managers = [manager(1, [pick(10, null)]), manager(2, [])];
    const [row] = buildExposures(managers, 1);
    expect(row.swingHorizon).toBeNull();
    expect(row.swingNext).toBeNull();
  });

  it("records who owns a player", () => {
    const managers = [manager(1, [pick(10, 5)], "Dylan"), manager(2, [pick(10, 5)], "Zac")];
    expect(buildExposures(managers, 1)[0].ownedBy).toEqual(["Dylan", "Zac"]);
  });
});

describe("chipWindowsFor", () => {
  const definitions: FplChip[] = [
    { id: 1, name: "3xc", number: 1, start_event: 1, stop_event: 19, chip_type: "team" },
    { id: 2, name: "3xc", number: 1, start_event: 20, stop_event: 38, chip_type: "team" },
  ];

  it("closes only the window the chip was played in", () => {
    const windows = chipWindowsFor(definitions, [{ name: "3xc", event: 3 }]);
    expect(windows[0]).toMatchObject({ used: true, usedInEvent: 3 });
    expect(windows[1].used).toBe(false);
  });

  it("leaves both open when nothing has been played", () => {
    expect(chipWindowsFor(definitions, []).every((window) => !window.used)).toBe(true);
  });

  it("does not match a chip played outside the window", () => {
    const windows = chipWindowsFor(definitions, [{ name: "3xc", event: 25 }]);
    expect(windows[0].used).toBe(false);
    expect(windows[1].used).toBe(true);
  });
});
