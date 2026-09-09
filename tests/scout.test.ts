import { describe, expect, it } from "vitest";
import {
  diffTemplate,
  pointsPer90,
  SQUAD_SHAPE,
  templateSquad,
  type ScoutPlayer,
} from "@/lib/model/scout";
import type { Position } from "@/lib/model/xp";

function scout(
  id: number,
  position: Position,
  overrides: Partial<ScoutPlayer> = {},
): ScoutPlayer {
  return {
    id,
    name: `P${id}`,
    teamId: 1,
    teamShort: "ARS",
    position,
    price: 5,
    priceChangeEvent: 0,
    availability: "available",
    totalPoints: 10,
    pointsPerMillion: 2,
    pointsPer90: 3,
    form: 3,
    minutes: 270,
    minutesShare: 1,
    selectedBy: 10,
    xgPer90: 0.2,
    xaPer90: 0.2,
    isProjected: true,
    xpNext: 4,
    xpHorizon: 20,
    fixtureRun: 3,
    fixtureSwing: 0,
    leagueOwned: 0,
    leagueStarted: 0,
    effectiveOwnership: 0,
    ownedByMe: false,
    ...overrides,
  };
}

/** A full pool: enough of every position to fill a template squad. */
function pool(): ScoutPlayer[] {
  const players: ScoutPlayer[] = [];
  let id = 1;
  for (const [position, count] of Object.entries(SQUAD_SHAPE) as [Position, number][]) {
    for (let index = 0; index < count + 2; index += 1) {
      players.push(
        scout(id, position, {
          // Descending global ownership, ascending league ownership.
          selectedBy: 100 - index * 10,
          leagueOwned: index,
        }),
      );
      id += 1;
    }
  }
  return players;
}

describe("pointsPer90", () => {
  it("scales points to a full match", () => {
    expect(pointsPer90(10, 180)).toBe(5);
  });

  it("refuses to rate a player with under a match of minutes", () => {
    expect(pointsPer90(6, 45)).toBeNull();
  });

  it("does not divide by zero", () => {
    expect(pointsPer90(0, 0)).toBeNull();
  });
});

describe("templateSquad", () => {
  it("picks a legal squad shape", () => {
    const squad = templateSquad(pool(), "global");
    expect(squad).toHaveLength(15);
    for (const [position, count] of Object.entries(SQUAD_SHAPE) as [Position, number][]) {
      expect(squad.filter((player) => player.position === position)).toHaveLength(count);
    }
  });

  it("takes the most globally owned when asked for the global template", () => {
    const keepers = templateSquad(pool(), "global").filter((p) => p.position === "GKP");
    expect(keepers.map((player) => player.selectedBy)).toEqual([100, 90]);
  });

  it("takes a different squad for the league template", () => {
    const global = templateSquad(pool(), "global").map((p) => p.id);
    const league = templateSquad(pool(), "league").map((p) => p.id);
    expect(league).not.toEqual(global);
  });

  it("breaks ownership ties on points, not array order", () => {
    const tied = [
      scout(1, "FWD", { selectedBy: 50, totalPoints: 5 }),
      scout(2, "FWD", { selectedBy: 50, totalPoints: 90 }),
      scout(3, "FWD", { selectedBy: 50, totalPoints: 40 }),
    ];
    expect(templateSquad(tied, "global").map((p) => p.id)).toEqual([2, 3, 1]);
  });
});

describe("diffTemplate", () => {
  const players = pool();
  const template = templateSquad(players, "global");

  it("reports full overlap when I hold the template", () => {
    const diff = diffTemplate(template, template.map((p) => p.id), players);
    expect(diff.overlap).toBe(1);
    expect(diff.missing).toEqual([]);
  });

  it("lists the template players I don't hold", () => {
    const held = template.slice(1).map((p) => p.id);
    const diff = diffTemplate(template, held, players);
    expect(diff.missing.map((p) => p.id)).toEqual([template[0].id]);
    expect(diff.overlap).toBeCloseTo(14 / 15);
  });

  it("lists what I hold that isn't template", () => {
    const offTemplateId = players.find((p) => !template.includes(p))!.id;
    const diff = diffTemplate(template, [offTemplateId], players);
    expect(diff.offTemplate.map((p) => p.id)).toEqual([offTemplateId]);
  });

  it("is zero overlap for an empty squad, not a crash", () => {
    expect(diffTemplate(template, [], players).overlap).toBe(0);
  });
});
