/**
 * Team form (product spec §6.2), and the attack/defence split it turns on.
 *
 * **What the FPL API will and won't give us.** Match results are in
 * `/fixtures/` and are exact. Per-match xG is not: a finished fixture carries
 * goals, assists, cards, bonus and BPS, but nothing expected. So recent form is
 * built from actual goals, and the underlying numbers are season-to-date,
 * derived from the player table:
 *
 * - **Team xG** = the sum of its players' individual `expected_goals`. Each
 *   shot belongs to one player, so this doesn't double count.
 * - **Team xGC** = the first-choice keeper's `expected_goals_conceded`, which
 *   is the team's xGC over the minutes he played. Summing outfielders here
 *   would count the same conceded chance ten times over.
 *
 * Sanity-checked against the live season: 20 teams' derived xG totalled 93.9
 * against 85 actual goals, and derived xGC 89.9 against the same 85 conceded.
 */
import type { FplFixture } from "@/lib/fpl/types";
import type { Player } from "./players";
import type { Team } from "./teams";

export interface TeamForm {
  teamId: number;
  /** Matches counted — fewer than the window early in a season. */
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  points: number;
  goalsForPerGame: number;
  goalsAgainstPerGame: number;
  /** Season to date, not the form window — see the note above. */
  expectedGoals: number;
  expectedGoalsConceded: number;
}

/** Most recent finished match first. */
function finishedFor(fixtures: FplFixture[], teamId: number): FplFixture[] {
  return fixtures
    .filter(
      (fixture) =>
        fixture.finished &&
        fixture.team_h_score !== null &&
        fixture.team_a_score !== null &&
        (fixture.team_h === teamId || fixture.team_a === teamId),
    )
    .sort((a, b) => (b.kickoff_time ?? "").localeCompare(a.kickoff_time ?? ""));
}

export function buildTeamForm(
  teams: Team[],
  fixtures: FplFixture[],
  players: Player[],
  window = 5,
): TeamForm[] {
  const xg = new Map<number, number>();
  const xgc = new Map<number, number>();

  for (const player of players) {
    xg.set(player.teamId, (xg.get(player.teamId) ?? 0) + player.expectedGoals);
    if (player.position === "GKP") {
      // Highest, not summed: the first-choice keeper's figure is the team's.
      xgc.set(player.teamId, Math.max(xgc.get(player.teamId) ?? 0, player.expectedGoalsConceded));
    }
  }

  return teams.map((team) => {
    const recent = finishedFor(fixtures, team.id).slice(0, window);

    let wins = 0;
    let draws = 0;
    let losses = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let cleanSheets = 0;

    for (const fixture of recent) {
      const isHome = fixture.team_h === team.id;
      const scored = (isHome ? fixture.team_h_score : fixture.team_a_score) ?? 0;
      const conceded = (isHome ? fixture.team_a_score : fixture.team_h_score) ?? 0;

      goalsFor += scored;
      goalsAgainst += conceded;
      if (conceded === 0) cleanSheets += 1;
      if (scored > conceded) wins += 1;
      else if (scored === conceded) draws += 1;
      else losses += 1;
    }

    const played = recent.length;

    return {
      teamId: team.id,
      played,
      wins,
      draws,
      losses,
      goalsFor,
      goalsAgainst,
      cleanSheets,
      points: wins * 3 + draws,
      goalsForPerGame: played > 0 ? goalsFor / played : 0,
      goalsAgainstPerGame: played > 0 ? goalsAgainst / played : 0,
      expectedGoals: xg.get(team.id) ?? 0,
      expectedGoalsConceded: xgc.get(team.id) ?? 0,
    };
  });
}

/**
 * Standard score across the 20 teams. Returns all zeroes when every team has
 * the same value — with no spread there is nothing to rank, and dividing by a
 * zero standard deviation would produce infinities.
 */
export function zScores(values: number[]): number[] {
  if (values.length === 0) return [];
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  const variance =
    values.reduce((total, value) => total + (value - mean) ** 2, 0) / values.length;
  const deviation = Math.sqrt(variance);
  if (deviation === 0) return values.map(() => 0);
  return values.map((value) => (value - mean) / deviation);
}
