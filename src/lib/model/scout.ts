/**
 * Scout's shared shapes and pure logic (product spec §5).
 *
 * **No server imports live here.** The template view is a client component and
 * imports `templateSquad` at runtime; if this module reached for `getGameData`
 * or `getLeagueView` it would drag `use cache` and `next/cache` into the browser
 * bundle and fail the build. The data loader lives in `scout-data.ts`.
 */
import type { Position } from "./xp";

export interface ScoutPlayer {
  id: number;
  name: string;
  teamId: number;
  teamShort: string;
  position: Position;
  price: number;
  priceChangeEvent: number;
  availability: "available" | "doubtful" | "out";

  totalPoints: number;
  pointsPerMillion: number;
  /** Separates a good player from one who has simply played more (§5.1). */
  pointsPer90: number | null;
  form: number;
  minutes: number;
  minutesShare: number;
  selectedBy: number;
  xgPer90: number;
  xaPer90: number;

  isProjected: boolean;
  xpNext: number | null;
  xpHorizon: number | null;

  /** Mean fixture value over the next X gameweeks; higher is easier. */
  fixtureRun: number;
  /** Next X minus last X — positive means the run is about to turn easier. */
  fixtureSwing: number;

  /** Of the managers in my mini-league. */
  leagueOwned: number;
  leagueStarted: number;
  effectiveOwnership: number;
  ownedByMe: boolean;
}

export interface ScoutData {
  players: ScoutPlayer[];
  leagueSize: number;
  horizon: number;
  /** Squad ids I currently hold, for the template diff. */
  mySquad: number[];
}

/** Points per 90, or null below a match's worth of minutes — the rate is noise. */
export function pointsPer90(totalPoints: number, minutes: number): number | null {
  if (minutes < 90) return null;
  return (totalPoints / minutes) * 90;
}

/* --- Template squad (§5.2) ------------------------------------------------ */

/** A full FPL squad: 2 keepers, 5 defenders, 5 midfielders, 3 forwards. */
export const SQUAD_SHAPE: Record<Position, number> = { GKP: 2, DEF: 5, MID: 5, FWD: 3 };

export type TemplateSource = "global" | "league";

/**
 * The squad most managers converge on — the most-owned player at each position.
 *
 * It is a risk measure, not a target: knowing you are missing a 60%-owned
 * forward tells you your downside if he hauls, not that you should buy him.
 */
export function templateSquad(players: ScoutPlayer[], source: TemplateSource): ScoutPlayer[] {
  const key = (player: ScoutPlayer) =>
    source === "global" ? player.selectedBy : player.leagueOwned;

  return (Object.keys(SQUAD_SHAPE) as Position[]).flatMap((position) =>
    players
      .filter((player) => player.position === position)
      .sort((a, b) => key(b) - key(a) || b.totalPoints - a.totalPoints)
      .slice(0, SQUAD_SHAPE[position]),
  );
}

export interface TemplateDiff {
  template: ScoutPlayer[];
  /** Template players I don't hold — my downside exposure. */
  missing: ScoutPlayer[];
  /** Players I hold that aren't template — where my season is different. */
  offTemplate: ScoutPlayer[];
  /** How much of the template I hold, 0–1. */
  overlap: number;
}

export function diffTemplate(
  template: ScoutPlayer[],
  mySquad: number[],
  players: ScoutPlayer[],
): TemplateDiff {
  const mine = new Set(mySquad);
  const inTemplate = new Set(template.map((player) => player.id));
  const held = template.filter((player) => mine.has(player.id));

  return {
    template,
    missing: template.filter((player) => !mine.has(player.id)),
    offTemplate: players.filter(
      (player) => mine.has(player.id) && !inTemplate.has(player.id),
    ),
    overlap: template.length === 0 ? 0 : held.length / template.length,
  };
}
