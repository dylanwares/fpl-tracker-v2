/**
 * Fixture difficulty, behind one function.
 *
 * **This is interim.** It returns FPL's official FDR, which is set before the
 * season and never moves — a promoted side that turns out to be good keeps its
 * easy rating all year. Product spec §7.5 replaces it with our own team ratings
 * at Stage 5.
 *
 * Everything that shows difficulty goes through here, so that swap is a change
 * to this file and nothing else.
 */
import type { FplFixture } from "@/lib/fpl/types";
import type { Difficulty } from "@/components/ui/fixture-cell";
import type { ScheduledFixture } from "./fixtures";

export const DIFFICULTY_SOURCE = "FPL official FDR";

function clamp(value: number): Difficulty {
  return Math.min(5, Math.max(1, Math.round(value))) as Difficulty;
}

/** Difficulty of a fixture from the point of view of `teamId`. */
export function difficultyFor(fixture: ScheduledFixture, raw: FplFixture): Difficulty {
  return clamp(fixture.isHome ? raw.team_h_difficulty : raw.team_a_difficulty);
}
