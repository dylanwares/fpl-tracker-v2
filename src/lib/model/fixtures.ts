/**
 * Fixture normalisation — the 380-match list turned into a schedule per team.
 *
 * Blanks and doubles are the whole point of this file. FPL does not mark them:
 * a blank is a gameweek with no row for your team (usually because a fixture
 * was pulled for a cup tie and now has `event: null`), and a double is two
 * rows. Both fall out naturally of grouping by gameweek, provided nothing
 * downstream assumes exactly one fixture per team per week.
 */
import type { FplFixture } from "@/lib/fpl/types";

export interface ScheduledFixture {
  fixtureId: number;
  gameweek: number;
  teamId: number;
  opponentId: number;
  isHome: boolean;
  kickoff: string | null;
  finished: boolean;
}

/** team id → gameweek → the fixtures in it (empty = blank, 2+ = double). */
export type Schedule = Map<number, Map<number, ScheduledFixture[]>>;

export function buildSchedule(fixtures: FplFixture[]): Schedule {
  const schedule: Schedule = new Map();

  const add = (entry: ScheduledFixture) => {
    let byGameweek = schedule.get(entry.teamId);
    if (!byGameweek) {
      byGameweek = new Map();
      schedule.set(entry.teamId, byGameweek);
    }
    const existing = byGameweek.get(entry.gameweek);
    if (existing) existing.push(entry);
    else byGameweek.set(entry.gameweek, [entry]);
  };

  for (const fixture of fixtures) {
    // `event: null` means postponed and not yet rescheduled — it belongs to no
    // gameweek, which is precisely what makes the original week a blank.
    if (fixture.event === null) continue;

    const shared = {
      fixtureId: fixture.id,
      gameweek: fixture.event,
      kickoff: fixture.kickoff_time,
      finished: fixture.finished,
    };

    add({ ...shared, teamId: fixture.team_h, opponentId: fixture.team_a, isHome: true });
    add({ ...shared, teamId: fixture.team_a, opponentId: fixture.team_h, isHome: false });
  }

  for (const byGameweek of schedule.values()) {
    for (const entries of byGameweek.values()) {
      entries.sort((a, b) => (a.kickoff ?? "").localeCompare(b.kickoff ?? ""));
    }
  }

  return schedule;
}

/**
 * A team's fixtures across a run of gameweeks — one entry per gameweek, in
 * order, each holding zero fixtures (blank), one, or more (double).
 */
export function runFor(
  schedule: Schedule,
  teamId: number,
  gameweeks: number[],
): { gameweek: number; fixtures: ScheduledFixture[] }[] {
  const byGameweek = schedule.get(teamId);
  return gameweeks.map((gameweek) => ({
    gameweek,
    fixtures: byGameweek?.get(gameweek) ?? [],
  }));
}

export function isBlank(entry: { fixtures: ScheduledFixture[] }): boolean {
  return entry.fixtures.length === 0;
}

export function isDouble(entry: { fixtures: ScheduledFixture[] }): boolean {
  return entry.fixtures.length > 1;
}
