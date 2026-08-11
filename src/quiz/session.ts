import { useCallback, useEffect, useState } from 'react';

import { localDateKey } from './date';
import { fetchLatestRerollSalt } from '@/services/reroll';

/**
 * Hourly "session" of the daily quiz. A fresh set is drawn every hour on the
 * hour from FIRST_HOUR to LAST_HOUR (sessions 14,15,…,20). From LAST_HOUR until
 * FIRST_HOUR the next day the LAST_HOUR set persists; sessions played before
 * FIRST_HOUR belong to the *previous* day's LAST_HOUR set (dateKey rolls back).
 */
const FIRST_HOUR = 10;
const LAST_HOUR = 20;

export interface DailySession {
  dateKey: string; // the day the session belongs to
  hour: number; // FIRST_HOUR..LAST_HOUR
}

export const SESSION_HOURS = Array.from(
  { length: LAST_HOUR - FIRST_HOUR + 1 },
  (_, i) => FIRST_HOUR + i,
);

export function currentSession(now: Date = new Date()): DailySession {
  const h = now.getHours();
  if (h >= FIRST_HOUR && h < LAST_HOUR) return { dateKey: localDateKey(now), hour: h };
  if (h >= LAST_HOUR) return { dateKey: localDateKey(now), hour: LAST_HOUR };
  // Before FIRST_HOUR → the previous day's LAST_HOUR session.
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  return { dateKey: localDateKey(y), hour: LAST_HOUR };
}

/** Stable id that changes exactly when the active set should change. */
export function sessionId(s: DailySession): string {
  return `${s.dateKey}h${s.hour}`;
}

/** Re-evaluates the session in the background; updates state only when it flips. */
export function useCurrentSession(): DailySession {
  const [session, setSession] = useState<DailySession>(() => currentSession());
  useEffect(() => {
    const tick = () => {
      const next = currentSession();
      setSession((prev) => (sessionId(prev) === sessionId(next) ? prev : next));
    };
    const iv = window.setInterval(tick, 30_000);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('focus', tick);
    };
  }, []);
  return session;
}

/**
 * Polls for a manual reroll of `dateKey` (see `services/reroll.ts`). Returns
 * '' when the day hasn't been rerolled, else a salt that changes every time
 * the admin triggers a new draw — mix it into the quiz seed to re-draw
 * questions for everyone without waiting for the next hourly session.
 */
export function useDailyReroll(dateKey: string): { salt: string; refresh: () => void } {
  const [salt, setSalt] = useState('');

  const refresh = useCallback(() => {
    fetchLatestRerollSalt(dateKey)
      .then(setSalt)
      .catch(() => {
        /* transient fetch failure — keep the last known salt */
      });
  }, [dateKey]);

  useEffect(() => {
    refresh();
    const iv = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(iv);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);

  return { salt, refresh };
}
