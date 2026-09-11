import { describe, expect, it } from "vitest";
import type { Rag } from "@/components/ui/rag";
import {
  padLeft,
  summariseGameweek,
  PAST_COLUMNS,
  type DetailMatch,
  type PlayedMatch,
} from "@/lib/model/form-strip";

const match = (opponent: string): DetailMatch => ({
  opponent,
  opponentName: opponent,
  isHome: true,
  difficulty: 3,
});

const played = (gameweek: number, over: Partial<PlayedMatch> = {}): PlayedMatch => ({
  gameweek,
  minutes: 90,
  points: 6,
  xg: 0.5,
  saves: 0,
  ...over,
});

/** Rates anything at all as green, so a "none" can only come from the summariser. */
const alwaysGreen = (): Rag => "green";

describe("summariseGameweek", () => {
  it("sums both matches of a double into one column", () => {
    const column = summariseGameweek(
      7,
      [match("ARS"), match("BUR")],
      [played(7, { points: 2, minutes: 90, xg: 0.1 }), played(7, { points: 9, minutes: 75, xg: 0.8 })],
      alwaysGreen,
    );

    expect(column.points).toBe(11);
    expect(column.minutes).toBe(165);
    expect(column.xg).toBeCloseTo(0.9);
    expect(column.matches).toHaveLength(2);
  });

  it("rates a goalless start red, but an unused sub grey", () => {
    const rate = (points: number | null): Rag => (points !== null && points >= 5 ? "green" : "red");

    const flopped = summariseGameweek(3, [match("ARS")], [played(3, { points: 1 })], rate);
    const benched = summariseGameweek(3, [match("ARS")], [played(3, { minutes: 0, points: 0 })], rate);

    // Red is a verdict on a performance; grey is the absence of one. A benched
    // player scoring zero must not read as a player who played badly.
    expect(flopped.rag).toBe("red");
    expect(benched.rag).toBe("none");
    expect(benched.points).toBe(0);
  });

  it("leaves a blank gameweek unrated with no points", () => {
    const column = summariseGameweek(9, [], [played(9)], alwaysGreen);

    expect(column.points).toBeNull();
    expect(column.rag).toBe("none");
    expect(column.minutes).toBeNull();
  });

  it("reports no record when the team played but the player has no row", () => {
    const column = summariseGameweek(4, [match("ARS")], [played(3)], alwaysGreen);

    expect(column.points).toBeNull();
    expect(column.rag).toBe("none");
  });

  it("only counts rows from the gameweek asked for", () => {
    const column = summariseGameweek(
      5,
      [match("ARS")],
      [played(4, { points: 20 }), played(5, { points: 3 }), played(6, { points: 20 })],
      alwaysGreen,
    );

    expect(column.points).toBe(3);
  });
});

describe("padLeft", () => {
  it("pads on the left so the newest gameweek stays in the rightmost column", () => {
    const columns = padLeft([
      summariseGameweek(1, [match("ARS")], [played(1, { points: 4 })], alwaysGreen),
      summariseGameweek(2, [match("BUR")], [played(2, { points: 7 })], alwaysGreen),
    ]);

    expect(columns).toHaveLength(PAST_COLUMNS);
    expect(columns.slice(0, 3).every((column) => column.gameweek === null)).toBe(true);
    expect(columns[3].gameweek).toBe(1);
    expect(columns[4].points).toBe(7);
  });

  it("leaves a full row untouched", () => {
    const full = Array.from({ length: PAST_COLUMNS }, (_, index) =>
      summariseGameweek(index + 1, [match("ARS")], [played(index + 1)], alwaysGreen),
    );

    expect(padLeft(full)).toHaveLength(PAST_COLUMNS);
    expect(padLeft(full)[0].gameweek).toBe(1);
  });
});
