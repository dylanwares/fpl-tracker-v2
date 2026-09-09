import { describe, expect, it } from "vitest";
import { formatPrice, num, timeAgo } from "@/lib/utils";
import { resolveGameweekState } from "@/lib/fpl/gameweek";
import type { FplEvent } from "@/lib/fpl/types";

describe("formatPrice", () => {
  it("converts tenths of a million to a display price", () => {
    expect(formatPrice(60)).toBe("£6.0m");
    expect(formatPrice(145)).toBe("£14.5m");
  });
});

describe("num", () => {
  it("parses the API's numeric strings and tolerates nulls", () => {
    expect(num("4.3")).toBe(4.3);
    expect(num(null)).toBe(0);
    expect(num("")).toBe(0);
  });
});

describe("timeAgo", () => {
  it("describes data age for the stale indicator", () => {
    const now = new Date("2026-09-06T12:00:00Z");
    expect(timeAgo(new Date("2026-09-06T10:00:00Z"), now)).toBe("2h ago");
    expect(timeAgo(new Date("2026-09-06T11:59:30Z"), now)).toBe("just now");
  });
});

describe("resolveGameweekState", () => {
  const events = [
    { id: 3, is_current: true, is_next: false, is_previous: false, finished: false },
    { id: 4, is_current: false, is_next: true, is_previous: false, deadline_time: "2026-09-12T12:30:00Z" },
  ] as unknown as FplEvent[];

  it("picks out the gameweek being played and the one being planned", () => {
    const state = resolveGameweekState(events);
    expect(state.current?.id).toBe(3);
    expect(state.next?.id).toBe(4);
    expect(state.isLive).toBe(true);
  });
});
