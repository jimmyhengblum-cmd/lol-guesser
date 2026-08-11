/**
 * Admin-driven per-player daily resets (no DB delete needed).
 *
 * Add an entry to reset ONE player's day — just them:
 *  - the leaderboard ignores that player's rows for that day created BEFORE
 *    `after` (so their old score vanishes, but a fresh replay still counts);
 *  - that player's client clears its local quiz progress exactly ONCE
 *    (keyed by `token`, so it doesn't wipe progress on every reload).
 *
 * `userName` must match the display name stored on the score (what shows on the
 * board). `dateKey` is the local YYYY-MM-DD day. `after` is an ISO instant —
 * set it to "now" when adding the entry.
 */
export interface PlayerReset {
  userName: string;
  dateKey: string; // local YYYY-MM-DD
  after: string; // ISO cutoff — rows created before this are dropped
  token: string; // unique; the client consumes it once
}

export const PLAYER_RESETS: PlayerReset[] = [
  // (vcorreia 2026-06-11 reset retired — obsolete after the s7 hard reset.)
];

/** The reset entry that applies to this user on this local day, if any. */
export function pendingReset(userName: string | undefined, dateKey: string): PlayerReset | null {
  if (!userName) return null;
  return PLAYER_RESETS.find((r) => r.userName === userName && r.dateKey === dateKey) ?? null;
}
