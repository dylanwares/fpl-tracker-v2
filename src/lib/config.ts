/**
 * App configuration. IDs live in `.env.local` (see `.env.example`).
 *
 * FPL_ENTRY_ID  — your manager id, from the URL when you view your own team:
 *                 fantasy.premierleague.com/entry/<ENTRY_ID>/event/<GW>
 * FPL_LEAGUE_ID — the mini-league id, from:
 *                 fantasy.premierleague.com/leagues/<LEAGUE_ID>/standings/c
 */

function optionalId(raw: string | undefined): number | null {
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export const config = {
  entryId: optionalId(process.env.FPL_ENTRY_ID),
  leagueId: optionalId(process.env.FPL_LEAGUE_ID),
  /** Default horizon for "next X gameweeks" views (product spec §11). */
  defaultHorizon: 5,
  /** Minimum share of available minutes to enter a RAG peer group (§2.2). */
  minutesThreshold: 0.3,
} as const;

export function requireEntryId(): number {
  if (config.entryId === null) {
    throw new Error("FPL_ENTRY_ID is not set. Add it to .env.local — see .env.example.");
  }
  return config.entryId;
}

export function requireLeagueId(): number {
  if (config.leagueId === null) {
    throw new Error("FPL_LEAGUE_ID is not set. Add it to .env.local — see .env.example.");
  }
  return config.leagueId;
}
