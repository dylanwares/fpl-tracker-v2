import type { FplEvent } from "./types";

export interface GameweekState {
  /** The gameweek in progress (or the most recent one if none is live). */
  current: FplEvent | null;
  /** The gameweek we are planning for — what most pages should key off. */
  next: FplEvent | null;
  previous: FplEvent | null;
  deadline: Date | null;
  /** True once the next deadline has passed but results aren't final. */
  isLive: boolean;
}

export function resolveGameweekState(events: FplEvent[]): GameweekState {
  const current = events.find((event) => event.is_current) ?? null;
  const next = events.find((event) => event.is_next) ?? null;
  const previous = events.find((event) => event.is_previous) ?? null;
  const deadline = next ? new Date(next.deadline_time) : null;

  return {
    current,
    next,
    previous,
    deadline,
    isLive: current !== null && !current.finished,
  };
}

/** The gameweek to plan for: the next one, falling back to the current. */
export function planningGameweek(state: GameweekState): number | null {
  return state.next?.id ?? state.current?.id ?? null;
}

/** The N gameweek ids from `from` onward that exist in the season. */
export function horizonEvents(events: FplEvent[], from: number, count: number): number[] {
  return events
    .filter((event) => event.id >= from)
    .slice(0, count)
    .map((event) => event.id);
}
