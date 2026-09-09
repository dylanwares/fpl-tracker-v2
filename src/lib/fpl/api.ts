/**
 * One function per FPL endpoint we use. Nothing here interprets the data —
 * normalisation and modelling live in `src/lib/model/`.
 */
import { fplFetch } from "./client";
import type {
  FplBootstrap,
  FplClassicLeague,
  FplElementSummary,
  FplEntry,
  FplEntryHistory,
  FplEntryPicks,
  FplEventLive,
  FplFixture,
  FplTransfer,
} from "./types";

/** Everything static-ish: players, teams, gameweeks. The workhorse call. */
export function getBootstrap() {
  return fplFetch<FplBootstrap>("/bootstrap-static/");
}

/** All 380 fixtures. Pass an event to narrow to one gameweek. */
export function getFixtures(event?: number) {
  const query = event === undefined ? "" : `?event=${event}`;
  return fplFetch<FplFixture[]>(`/fixtures/${query}`);
}

export function getEntry(entryId: number) {
  return fplFetch<FplEntry>(`/entry/${entryId}/`);
}

export function getEntryHistory(entryId: number) {
  return fplFetch<FplEntryHistory>(`/entry/${entryId}/history/`);
}

/** A manager's squad for one gameweek. Hidden for rivals until the GW starts. */
export function getEntryPicks(entryId: number, event: number) {
  return fplFetch<FplEntryPicks>(`/entry/${entryId}/event/${event}/picks/`);
}

export function getEntryTransfers(entryId: number) {
  return fplFetch<FplTransfer[]>(`/entry/${entryId}/transfers/`);
}

/** Mini-league standings. 50 managers per page. */
export function getLeagueStandings(leagueId: number, page = 1) {
  return fplFetch<FplClassicLeague>(`/leagues-classic/${leagueId}/standings/?page_standings=${page}`);
}

/**
 * Every player's actual return for one gameweek. Large (~464KB) — trim before
 * caching, and note that a finished gameweek never changes again.
 */
export function getEventLive(event: number) {
  return fplFetch<FplEventLive>(`/event/${event}/live/`);
}

/** Per-player match-by-match history and upcoming fixtures. */
export function getElementSummary(elementId: number) {
  return fplFetch<FplElementSummary>(`/element-summary/${elementId}/`);
}
