import { describe, expect, it } from "vitest";
import type { FplFixture } from "@/lib/fpl/types";
import { buildTeamForm, zScores } from "@/lib/model/form";
import type { Player } from "@/lib/model/players";
import type { Team } from "@/lib/model/teams";
import { fixtureValue, rateRows, runValue, sortRated, type TickerRow } from "@/lib/model/ticker";

const teams: Team[] = [
  { id: 1, code: 3, name: "Arsenal", shortName: "ARS", position: 1, played: 2, points: 6 },
  { id: 2, code: 7, name: "Aston Villa", shortName: "AVL", position: 2, played: 2, points: 0 },
];

function played(
  id: number,
  home: number,
  away: number,
  homeScore: number,
  awayScore: number,
  kickoff: string,
): FplFixture {
  return {
    id,
    code: id,
    event: 1,
    kickoff_time: kickoff,
    started: true,
    finished: true,
    finished_provisional: true,
    minutes: 90,
    team_h: home,
    team_a: away,
    team_h_score: homeScore,
    team_a_score: awayScore,
    team_h_difficulty: 3,
    team_a_difficulty: 3,
    stats: [],
  };
}

function player(teamId: number, position: Player["position"], xg: number, xgc: number): Player {
  return { teamId, position, expectedGoals: xg, expectedGoalsConceded: xgc } as Player;
}

describe("buildTeamForm", () => {
  const fixtures = [
    played(1, 1, 2, 3, 0, "2026-08-15T14:00:00Z"),
    played(2, 2, 1, 1, 1, "2026-08-22T14:00:00Z"),
  ];

  it("counts results from both sides of a fixture", () => {
    const [arsenal, villa] = buildTeamForm(teams, fixtures, []);
    expect(arsenal).toMatchObject({ played: 2, wins: 1, draws: 1, losses: 0, points: 4 });
    expect(villa).toMatchObject({ played: 2, wins: 0, draws: 1, losses: 1, points: 1 });
  });

  it("counts goals for and against from the team's own perspective", () => {
    const [arsenal, villa] = buildTeamForm(teams, fixtures, []);
    expect(arsenal.goalsFor).toBe(4);
    expect(arsenal.goalsAgainst).toBe(1);
    expect(villa.goalsFor).toBe(1);
    expect(villa.goalsAgainst).toBe(4);
  });

  it("counts a clean sheet only when nothing was conceded", () => {
    const [arsenal] = buildTeamForm(teams, fixtures, []);
    expect(arsenal.cleanSheets).toBe(1);
  });

  it("ignores fixtures that have not been played", () => {
    const withUpcoming = [...fixtures, { ...played(3, 1, 2, 0, 0, "2026-09-01T14:00:00Z"), finished: false, team_h_score: null, team_a_score: null }];
    expect(buildTeamForm(teams, withUpcoming, [])[0].played).toBe(2);
  });

  it("keeps only the most recent matches in the window", () => {
    const [arsenal] = buildTeamForm(teams, fixtures, [], 1);
    // The later match is the 1-1 draw.
    expect(arsenal.played).toBe(1);
    expect(arsenal.points).toBe(1);
  });

  it("does not divide by zero before a ball is kicked", () => {
    const [arsenal] = buildTeamForm(teams, [], []);
    expect(arsenal.goalsForPerGame).toBe(0);
    expect(arsenal.goalsAgainstPerGame).toBe(0);
  });

  describe("derived underlying numbers", () => {
    const players = [
      player(1, "FWD", 2.5, 0),
      player(1, "MID", 1.5, 0),
      player(1, "GKP", 0, 3.2),
      player(1, "GKP", 0, 0.4),
    ];

    it("sums individual xG for team xG", () => {
      expect(buildTeamForm(teams, fixtures, players)[0].expectedGoals).toBeCloseTo(4.0);
    });

    it("takes the first-choice keeper's xGC rather than summing keepers", () => {
      expect(buildTeamForm(teams, fixtures, players)[0].expectedGoalsConceded).toBe(3.2);
    });
  });
});

describe("zScores", () => {
  it("centres on the mean", () => {
    expect(zScores([1, 2, 3])[1]).toBeCloseTo(0);
  });

  it("returns zeroes rather than infinities when every value is the same", () => {
    expect(zScores([4, 4, 4])).toEqual([0, 0, 0]);
  });
});

describe("fixtureValue", () => {
  const cell = (difficulties: number[]) => ({
    gameweek: 4,
    matches: difficulties.map((difficulty) => ({
      opponent: "ARS",
      opponentName: "Arsenal",
      isHome: true,
      difficulty: difficulty as 1 | 2 | 3 | 4 | 5,
    })),
  });

  it("scores a blank zero rather than ignoring it", () => {
    expect(fixtureValue(cell([]))).toBe(0);
  });

  it("scores an easy fixture above a hard one", () => {
    expect(fixtureValue(cell([1]))).toBe(5);
    expect(fixtureValue(cell([5]))).toBe(1);
  });

  it("rates two middling fixtures above one easy one", () => {
    expect(fixtureValue(cell([3, 3]))).toBeGreaterThan(fixtureValue(cell([1])));
  });
});

describe("rateRows", () => {
  const row = (team: Team, difficulties: number[], goalsFor: number, goalsAgainst: number) =>
    ({
      team,
      cells: difficulties.map((difficulty, index) => ({
        gameweek: index + 4,
        matches: [
          { opponent: "X", opponentName: "X", isHome: true, difficulty: difficulty as 1 | 2 | 3 | 4 | 5 },
        ],
      })),
      form: {
        teamId: team.id,
        played: 2,
        goalsForPerGame: goalsFor,
        goalsAgainstPerGame: goalsAgainst,
      },
    }) as TickerRow;

  const rows = [row(teams[0], [1, 1, 1], 3, 0.5), row(teams[1], [5, 5, 5], 0.5, 3)];

  it("averages fixture value across the horizon", () => {
    expect(runValue(rows[0], 3)).toBe(5);
    expect(runValue(rows[1], 3)).toBe(1);
  });

  it("respects the horizon rather than scoring every gameweek held", () => {
    const mixed = row(teams[0], [1, 5], 1, 1);
    expect(runValue(mixed, 1)).toBe(5);
    expect(runValue(mixed, 2)).toBe(3);
  });

  it("makes a good defence a positive z-score, like every other rating", () => {
    const rated = rateRows(rows, 3);
    expect(rated[0].defenceZ).toBeGreaterThan(0);
    expect(rated[1].defenceZ).toBeLessThan(0);
  });

  it("sorts best-first on each key", () => {
    const rated = rateRows(rows, 3);
    expect(sortRated(rated, "fixtures")[0].row.team.id).toBe(1);
    expect(sortRated(rated, "attack")[0].row.team.id).toBe(1);
    expect(sortRated(rated, "defence")[0].row.team.id).toBe(1);
    expect(sortRated(rated, "name")[0].row.team.name).toBe("Arsenal");
  });
});
