import { describe, expect, it } from "vitest";
import type { FplElement, FplFixture, FplTeam } from "@/lib/fpl/types";
import { buildSchedule, isBlank, isDouble, runFor } from "@/lib/model/fixtures";
import { buildPlayers } from "@/lib/model/players";
import { byExpectedPoints, type PooledPlayer } from "@/lib/model/pool";
import { buildTeams, teamsById } from "@/lib/model/teams";

/** A real element has ~90 fields; only the ones we read need real values. */
function element(overrides: Partial<FplElement> = {}): FplElement {
  return {
    id: 1,
    code: 100,
    team: 1,
    team_code: 1,
    element_type: 3,
    first_name: "Bruno",
    second_name: "Fernandes",
    web_name: "B.Fernandes",
    known_name: null,
    squad_number: null,
    photo: "",
    now_cost: 90,
    cost_change_event: 0,
    cost_change_start: 0,
    selected_by_percent: "24.3",
    status: "a",
    news: "",
    news_added: null,
    chance_of_playing_this_round: null,
    chance_of_playing_next_round: null,
    total_points: 45,
    event_points: 6,
    points_per_game: "5.6",
    form: "6.2",
    minutes: 270,
    starts: 3,
    goals_scored: 2,
    assists: 3,
    clean_sheets: 1,
    goals_conceded: 2,
    own_goals: 0,
    penalties_saved: 0,
    penalties_missed: 0,
    yellow_cards: 1,
    red_cards: 0,
    saves: 0,
    saves_per_90: 0,
    bonus: 4,
    bps: 90,
    defensive_contribution: 6,
    defensive_contribution_per_90: 2,
    tackles: 5,
    recoveries: 20,
    clearances_blocks_interceptions: 4,
    expected_goals: "1.20",
    expected_assists: "2.40",
    expected_goal_involvements: "3.60",
    expected_goals_conceded: "3.10",
    expected_goals_per_90: 0.4,
    expected_assists_per_90: 0.8,
    expected_goal_involvements_per_90: 1.2,
    expected_goals_conceded_per_90: 1.03,
    clean_sheets_per_90: 0.33,
    goals_conceded_per_90: 0.66,
    influence: "120.0",
    creativity: "200.0",
    threat: "80.0",
    ict_index: "40.0",
    penalties_order: 1,
    corners_and_indirect_freekicks_order: 1,
    direct_freekicks_order: 1,
    transfers_in_event: 1000,
    transfers_out_event: 500,
    value_form: "0.7",
    value_season: "5.0",
    starts_per_90: 1,
    ...overrides,
  };
}

function fixture(overrides: Partial<FplFixture> = {}): FplFixture {
  return {
    id: 1,
    code: 1,
    event: 4,
    kickoff_time: "2026-09-12T14:00:00Z",
    started: false,
    finished: false,
    finished_provisional: false,
    minutes: 0,
    team_h: 1,
    team_a: 2,
    team_h_score: null,
    team_a_score: null,
    team_h_difficulty: 3,
    team_a_difficulty: 3,
    stats: [],
    ...overrides,
  };
}

describe("buildPlayers", () => {
  it("converts price from tenths of a million", () => {
    const [player] = buildPlayers([element({ now_cost: 145 })], 270);
    expect(player.price).toBe(14.5);
  });

  it("parses the API's numeric strings once", () => {
    const [player] = buildPlayers([element()], 270);
    expect(player.form).toBe(6.2);
    expect(player.selectedBy).toBe(24.3);
    expect(player.pointsPerGame).toBe(5.6);
  });

  it("derives points per million from current price", () => {
    const [player] = buildPlayers([element({ total_points: 45, now_cost: 90 })], 270);
    expect(player.pointsPerMillion).toBeCloseTo(5.0);
  });

  it("expresses minutes as a share of those available", () => {
    const [player] = buildPlayers([element({ minutes: 135 })], 270);
    expect(player.minutesShare).toBe(0.5);
  });

  it("does not divide by zero before a ball is kicked", () => {
    const [player] = buildPlayers([element({ minutes: 0 })], 0);
    expect(player.minutesShare).toBe(0);
  });

  it("maps element type to position", () => {
    const positions = buildPlayers(
      [
        element({ id: 1, element_type: 1 }),
        element({ id: 2, element_type: 2 }),
        element({ id: 3, element_type: 3 }),
        element({ id: 4, element_type: 4 }),
      ],
      270,
    ).map((player) => player.position);
    expect(positions).toEqual(["GKP", "DEF", "MID", "FWD"]);
  });

  describe("availability", () => {
    it("trusts a low chance of playing over a clean status", () => {
      const [player] = buildPlayers(
        [element({ status: "a", chance_of_playing_next_round: 25 })],
        270,
      );
      expect(player.availability).toBe("out");
    });

    it("reads a partial chance as doubtful", () => {
      const [player] = buildPlayers([element({ chance_of_playing_next_round: 75 })], 270);
      expect(player.availability).toBe("doubtful");
    });

    it("treats suspension as out", () => {
      const [player] = buildPlayers([element({ status: "s" })], 270);
      expect(player.availability).toBe("out");
    });

    it("leaves a fit player available", () => {
      const [player] = buildPlayers([element()], 270);
      expect(player.availability).toBe("available");
    });
  });
});

describe("buildTeams", () => {
  const raw = [
    { id: 2, code: 7, name: "Aston Villa", short_name: "AVL", position: 0, played: 0, points: 0 },
    { id: 1, code: 3, name: "Arsenal", short_name: "ARS", position: 4, played: 3, points: 7 },
  ] as FplTeam[];

  it("sorts alphabetically and keeps the season-stable code", () => {
    const teams = buildTeams(raw);
    expect(teams.map((team) => team.shortName)).toEqual(["ARS", "AVL"]);
    expect(teams[0].code).toBe(3);
  });

  it("treats a zero league position as unknown, not first", () => {
    const teams = buildTeams(raw);
    expect(teams.find((team) => team.shortName === "AVL")?.position).toBeNull();
  });

  it("indexes by id", () => {
    expect(teamsById(buildTeams(raw)).get(1)?.name).toBe("Arsenal");
  });
});

describe("buildSchedule", () => {
  it("records a fixture for both teams, from each side", () => {
    const schedule = buildSchedule([fixture()]);
    const [home] = runFor(schedule, 1, [4]);
    const [away] = runFor(schedule, 2, [4]);
    expect(home.fixtures[0]).toMatchObject({ opponentId: 2, isHome: true });
    expect(away.fixtures[0]).toMatchObject({ opponentId: 1, isHome: false });
  });

  it("reports a gameweek with no fixture as a blank", () => {
    const schedule = buildSchedule([fixture()]);
    const [gw5] = runFor(schedule, 1, [5]);
    expect(isBlank(gw5)).toBe(true);
    expect(gw5.fixtures).toEqual([]);
  });

  it("keeps both matches of a double gameweek", () => {
    const schedule = buildSchedule([
      fixture({ id: 1, team_h: 1, team_a: 2, kickoff_time: "2026-09-12T14:00:00Z" }),
      fixture({ id: 2, team_h: 3, team_a: 1, kickoff_time: "2026-09-15T19:00:00Z" }),
    ]);
    const [gw4] = runFor(schedule, 1, [4]);
    expect(isDouble(gw4)).toBe(true);
    expect(gw4.fixtures.map((f) => f.opponentId)).toEqual([2, 3]);
  });

  it("excludes postponed fixtures, which is what creates the blank", () => {
    const schedule = buildSchedule([fixture({ event: null })]);
    expect(runFor(schedule, 1, [4]).every(isBlank)).toBe(true);
  });

  it("returns one entry per requested gameweek, in order", () => {
    const run = runFor(buildSchedule([fixture()]), 1, [4, 5, 6]);
    expect(run.map((entry) => entry.gameweek)).toEqual([4, 5, 6]);
  });
});

describe("byExpectedPoints", () => {
  const entry = (id: number, xpHorizon: number | null) =>
    ({ player: { id }, xpHorizon }) as PooledPlayer;

  it("sorts unprojected players last, descending", () => {
    const sorted = [entry(1, 12), entry(2, null), entry(3, 30)].sort(byExpectedPoints());
    expect(sorted.map((e) => e.player.id)).toEqual([3, 1, 2]);
  });

  it("keeps them last when the sort is reversed, rather than promoting them", () => {
    const sorted = [entry(1, 12), entry(2, null), entry(3, 30)].sort(
      byExpectedPoints("xpHorizon", "asc"),
    );
    expect(sorted.map((e) => e.player.id)).toEqual([1, 3, 2]);
  });
});
