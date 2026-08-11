import { getRayfinClient } from './rayfinClient';

/** The account allowed to trigger a manual reroll (also enforced server-side). */
export const REROLL_ADMIN_EMAIL = 'jheng@datatorii.com';

interface RerollRow {
  dateKey: string | Date;
  salt: string;
  createdAt?: unknown;
}

/**
 * The SDK auto-converts any text field shaped like `YYYY-MM-DD` into a `Date`
 * on read (it can't tell `@text` apart from `@date` from the wire value
 * alone) — but not on write, so `dateKey` comes back as a `Date` while the
 * caller still passes a plain string. Normalize both to `YYYY-MM-DD` (using
 * UTC getters — the SDK parses date-only strings as UTC midnight) before
 * comparing, or every row silently fails to match.
 */
function normalizeDateKey(value: string | Date): string {
  if (typeof value === 'string') return value;
  const y = value.getUTCFullYear();
  const m = String(value.getUTCMonth() + 1).padStart(2, '0');
  const d = String(value.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Latest reroll salt for a day, or '' when the day hasn't been rerolled. */
export async function fetchLatestRerollSalt(dateKey: string): Promise<string> {
  const client = getRayfinClient();
  const rows = (await client.data.DailyReroll.select(['dateKey', 'salt', 'createdAt']).execute()) as RerollRow[];
  const todays = rows.filter((r) => normalizeDateKey(r.dateKey) === dateKey);
  if (!todays.length) return '';
  todays.sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime());
  return todays[0].salt;
}

/** Draws a fresh set of questions for `dateKey`, right now, for every player. */
export async function triggerReroll(dateKey: string, createdBy: string): Promise<void> {
  const client = getRayfinClient();
  await client.data.DailyReroll.create({
    dateKey,
    salt: Math.random().toString(36).slice(2, 10),
    createdBy,
    createdAt: new Date(),
  });
}
