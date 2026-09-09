/**
 * Team normalisation.
 *
 * Small, but it is the join key for everything else: players carry a team id,
 * fixtures carry two of them, and the fixture ticker is indexed by team.
 *
 * Note what is deliberately absent: FPL's `strength_*` ratings. They reset each
 * season and read 0 for the first few gameweeks, which is exactly when we want
 * them. Our own ratings arrive with the fixture ticker (product spec §7.5).
 */
import type { FplTeam } from "@/lib/fpl/types";

export interface Team {
  id: number;
  /** Stable across seasons — the key for badge assets. */
  code: number;
  name: string;
  shortName: string;
  /** League position, or null before a ball is kicked. */
  position: number | null;
  played: number;
  points: number;
}

export function buildTeams(raw: FplTeam[]): Team[] {
  return raw
    .map((team) => ({
      id: team.id,
      code: team.code,
      name: team.name,
      shortName: team.short_name,
      position: team.position > 0 ? team.position : null,
      played: team.played,
      points: team.points,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Lookup by id. Built at the call site so cached values stay plain arrays. */
export function teamsById(teams: Team[]): Map<number, Team> {
  return new Map(teams.map((team) => [team.id, team]));
}
