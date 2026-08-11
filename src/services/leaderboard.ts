import type { QuizMode } from '@/quiz/types';
import type { AuthUser } from './IAuthService';
import { PLAYER_RESETS } from './playerResets';
import { getRayfinClient } from './rayfinClient';

/**
 * Leaderboard "season". Scores are stored with a season token prefixed onto the
 * date key, and every query filters by it — bumping the token cleanly resets a
 * board (old rows stay in the DB but are never read). Normal and hardcore use
 * DISTINCT first characters (`s7` vs `h7`) so a `startsWith` prefix never
 * collides between the two modes.
 */
const SEASON = 's7'; // normal mode
const HARDCORE_SEASON = 'h9'; // hardcore mode (bumped to clear the board for testing)
const BLUR_SEASON = 'b1'; // blur mode (distinct first char so prefixes never collide)
const seasonToken = (mode: QuizMode) =>
  mode === 'hardcore' ? HARDCORE_SEASON : mode === 'blur' ? BLUR_SEASON : SEASON;
// Compact day key (fits the dateKey column): e.g. "2026-06-11" → "s7260611".
const seasonKey = (dateKey: string, mode: QuizMode) =>
  `${seasonToken(mode)}${dateKey.replace(/-/g, '').slice(2)}`;

const yymmdd = (dateKey: string) => dateKey.replace(/-/g, '').slice(2);
const pad2 = (n: number) => String(n).padStart(2, '0');
/** Prefix shared by all of a day's sessions for a mode (token + YYMMDD = 8 chars). */
const dayPrefix = (dateKey: string, mode: QuizMode) => `${seasonToken(mode)}${yymmdd(dateKey)}`;
/** DB key a *session* score is stored under: token + YYMMDD + 2-digit hour
 * (e.g. "h926061214"). Also used by the client's submit guard, so a board reset
 * (season bump) or a new session auto-resets it. */
export const sessionScoreKey = (dateKey: string, mode: QuizMode, hour: number) =>
  `${dayPrefix(dateKey, mode)}${pad2(hour)}`;

/**
 * Soft-reset carry-over. When a new season starts, the previous season's final
 * standings grant a *negligible* head-start so the podium order is preserved
 * but everyone else can catch up in a single day of play.
 *
 * The bonus is rank-based and capped: rank 1 gets `CARRY_MAX`, decreasing by
 * `CARRY_STEP` per rank, floored at 0. With 20 / 2 the leader carries 20 pts —
 * less than ONE round (100 pts) and ~1/40th of a full day (800 pts).
 *
 * Set `CARRY_FROM_SEASON` to '' to disable carry-over entirely.
 */
const CARRY_FROM_SEASON = ''; // official launch: true fresh start, no carry-over
const CARRY_MAX = 20;
const CARRY_STEP = 2;

/**
 * Per-player reset: drop a player's rows for a day that were created before the
 * reset cutoff (so their old score vanishes from both boards, but a fresh
 * replay — created after the cutoff — still counts). `sk` is the compact
 * season+date key the row lives under.
 */
function droppedByReset(userName: string | undefined, sk: string, createdAt: unknown): boolean {
  const created = createdAt ? new Date(createdAt as string).getTime() : NaN;
  if (Number.isNaN(created)) return false;
  return PLAYER_RESETS.some(
    (r) =>
      r.userName === userName &&
      (seasonKey(r.dateKey, 'normal') === sk || seasonKey(r.dateKey, 'hardcore') === sk) &&
      created < new Date(r.after).getTime(),
  );
}

/** One player's per-session scores for a day (the daily board, pivoted). */
export interface SessionDailyEntry {
  userId: string;
  userName: string;
  scores: Record<number, number>; // session hour → best points
  total: number; // sum of session bests
}
export interface DailyBoard {
  hours: number[]; // session hours present today, sorted
  rows: SessionDailyEntry[]; // sorted by total desc
}

export interface GeneralEntry {
  userId: string;
  userName: string;
  totalPoints: number;
  days: number;
}

export interface SubmitScoreInput {
  dateKey: string;
  mode: QuizMode;
  sessionHour: number;
  points: number;
  durationMs: number;
  user: AuthUser;
}

/** Records the signed-in user's score for the current session (per mode). */
export async function submitDailyScore(input: SubmitScoreInput): Promise<void> {
  const client = getRayfinClient();
  await client.data.DailyScore.create({
    dateKey: sessionScoreKey(input.dateKey, input.mode, input.sessionHour),
    points: input.points,
    durationMs: input.durationMs,
    userId: input.user.id,
    userName: input.user.name,
    createdAt: new Date(),
  });
}

interface ScoreRow {
  dateKey: string;
  userId: string;
  userName: string;
  points: number;
  durationMs: number;
  createdAt?: unknown;
}

async function allScores(): Promise<ScoreRow[]> {
  const client = getRayfinClient();
  return (await client.data.DailyScore.select([
    'dateKey',
    'userId',
    'userName',
    'points',
    'durationMs',
    'createdAt',
  ]).execute()) as ScoreRow[];
}

/**
 * Daily board for a day + mode, pivoted by session: best score per user per
 * session hour, plus a per-user total. Rows sorted by total desc.
 */
export async function fetchDailyLeaderboard(dateKey: string, mode: QuizMode): Promise<DailyBoard> {
  const prefix = dayPrefix(dateKey, mode); // 8 chars: token + YYMMDD
  const rows = (await allScores()).filter((r) => String(r.dateKey ?? '').startsWith(prefix));

  // Best points per (user, hour).
  const bestPerUserHour = new Map<string, { userId: string; userName: string; hour: number; points: number }>();
  for (const r of rows) {
    const key = String(r.dateKey ?? '');
    if (key.length !== prefix.length + 2) continue; // skip legacy non-session rows
    const hour = Number(key.slice(prefix.length));
    if (Number.isNaN(hour)) continue;
    const k = `${r.userId}:${hour}`;
    const cur = bestPerUserHour.get(k);
    if (!cur || r.points > cur.points) {
      bestPerUserHour.set(k, { userId: r.userId, userName: r.userName, hour, points: r.points });
    }
  }

  const byUser = new Map<string, SessionDailyEntry>();
  const hoursPresent = new Set<number>();
  for (const e of bestPerUserHour.values()) {
    hoursPresent.add(e.hour);
    let u = byUser.get(e.userId);
    if (!u) {
      u = { userId: e.userId, userName: e.userName, scores: {}, total: 0 };
      byUser.set(e.userId, u);
    }
    u.scores[e.hour] = e.points;
    u.userName = e.userName;
  }
  for (const u of byUser.values()) u.total = Object.values(u.scores).reduce((a, b) => a + b, 0);

  return {
    hours: [...hoursPresent].sort((a, b) => a - b),
    rows: [...byUser.values()].sort((a, b) => b.total - a.total).slice(0, 50),
  };
}

interface SeasonAgg {
  userId: string;
  userName: string;
  totalPoints: number;
  days: number;
}

/**
 * Cumulative best-per-day points per user for one season.
 * Filters by the compact season prefix (e.g. "s5260609" — NO colon; the old
 * `${SEASON}:` form never matched these keys and left the board empty).
 */
function aggregateSeason(rows: ScoreRow[], season: string): Map<string, SeasonAgg> {
  const inSeason = rows.filter(
    (r) =>
      String(r.dateKey ?? '').startsWith(season) &&
      !droppedByReset(r.userName, String(r.dateKey ?? ''), r.createdAt),
  );
  const bestPerUserDay = new Map<string, ScoreRow>();
  for (const r of inSeason) {
    // Group by DAY (token + YYMMDD = first 8 chars), so general = sum over days
    // of each day's best session — sessions don't multiply a day's contribution.
    const dayKey = String(r.dateKey ?? '').slice(0, 8);
    const k = `${r.userId}:${dayKey}`;
    const cur = bestPerUserDay.get(k);
    if (!cur || r.points > cur.points) bestPerUserDay.set(k, r);
  }
  const agg = new Map<string, SeasonAgg>();
  for (const r of bestPerUserDay.values()) {
    const cur = agg.get(r.userId);
    if (cur) {
      cur.totalPoints += r.points;
      cur.days += 1;
      cur.userName = r.userName; // keep the most recently seen display name
    } else {
      agg.set(r.userId, { userId: r.userId, userName: r.userName, totalPoints: r.points, days: 1 });
    }
  }
  return agg;
}

/** Negligible, rank-based head-start carried from the previous season. */
function carryBonuses(prev: Map<string, SeasonAgg>): Map<string, number> {
  const out = new Map<string, number>();
  if (!CARRY_FROM_SEASON) return out;
  const ranked = [...prev.values()].sort((a, b) => b.totalPoints - a.totalPoints);
  ranked.forEach((u, i) => {
    const bonus = Math.max(0, CARRY_MAX - i * CARRY_STEP);
    if (bonus > 0) out.set(u.userId, bonus);
  });
  return out;
}

/** All-time ranking for a mode — cumulative points per user, plus any carry. */
export async function fetchGeneralLeaderboard(mode: QuizMode): Promise<GeneralEntry[]> {
  const rows = await allScores();
  const current = aggregateSeason(rows, seasonToken(mode));
  const prev = CARRY_FROM_SEASON ? aggregateSeason(rows, CARRY_FROM_SEASON) : new Map<string, SeasonAgg>();
  const carry = carryBonuses(prev);

  const result = new Map<string, GeneralEntry>();
  for (const a of current.values()) {
    result.set(a.userId, {
      userId: a.userId,
      userName: a.userName,
      totalPoints: a.totalPoints,
      days: a.days,
    });
  }
  // Fold in the carry-over bonus (does NOT count as a day played).
  for (const [userId, bonus] of carry) {
    const cur = result.get(userId);
    if (cur) {
      cur.totalPoints += bonus;
    } else {
      const p = prev.get(userId);
      result.set(userId, { userId, userName: p?.userName ?? userId, totalPoints: bonus, days: 0 });
    }
  }

  return [...result.values()]
    .sort((a, b) => b.totalPoints - a.totalPoints || b.days - a.days)
    .slice(0, 20);
}
