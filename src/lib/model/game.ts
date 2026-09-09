/**
 * The cached game model — teams, players and gameweeks, trimmed.
 *
 * This is the fix for the caching problem found in Stage 1: `bootstrap-static`
 * is 2.3MB, over the 2MB ceiling on Next's fetch data cache, so the raw
 * response can never be cached and was refetched on every regeneration. Here
 * the *fetch* stays uncached and the *trimmed model* is cached instead — a
 * fraction of the size, and the shape every page actually wants.
 *
 * Everything returned is a plain array or primitive. Maps and objects with
 * methods do not survive a cache boundary, so lookups are built at the call
 * site with `teamsById` / `playersById`.
 */
import { cacheLife, cacheTag } from "next/cache";
import { getBootstrap, getFixtures } from "@/lib/fpl/api";
import { FplTag } from "@/lib/fpl/client";
import type { FplChip, FplEvent, FplFixture } from "@/lib/fpl/types";
import { buildPlayers, type Player } from "./players";
import { buildTeams, type Team } from "./teams";

export interface GameData {
  teams: Team[];
  players: Player[];
  events: FplEvent[];
  /** Chip windows — each chip is issued once per half of the season. */
  chips: FplChip[];
  /** Minutes available to a player so far this season — finished GWs × 90. */
  availableMinutes: number;
}

export async function getGameData(): Promise<GameData> {
  "use cache";
  cacheLife("fplData");
  cacheTag(FplTag.bootstrap);

  const bootstrap = await getBootstrap();
  const finished = bootstrap.events.filter((event) => event.finished).length;
  const availableMinutes = finished * 90;

  return {
    teams: buildTeams(bootstrap.teams),
    players: buildPlayers(bootstrap.elements, availableMinutes),
    events: bootstrap.events,
    chips: bootstrap.chips ?? [],
    availableMinutes,
  };
}

/** All 380 fixtures, raw. Shaped into per-team schedules in `fixtures.ts`. */
export async function getAllFixtures(): Promise<FplFixture[]> {
  "use cache";
  cacheLife("fplData");
  cacheTag(FplTag.fixtures);

  return getFixtures();
}
