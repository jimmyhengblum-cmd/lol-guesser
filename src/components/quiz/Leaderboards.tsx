import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/AuthContext';
import type { QuizMode } from '@/quiz/types';
import {
  sessionScoreKey,
  fetchDailyLeaderboard,
  submitDailyScore,
  type DailyBoard,
} from '@/services/leaderboard';

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

/** LoL rank tiers for the top 5; everyone below gets the poop of shame. */
interface Tier {
  label: string;
  slug: string;
  emoji: string;
}
const TIERS: Tier[] = [
  { label: 'Challenger', slug: 'challenger', emoji: '👑' },
  { label: 'Grand Maître', slug: 'grandmaster', emoji: '⚔️' },
  { label: 'Maître', slug: 'master', emoji: '🔮' },
  { label: 'Diamant', slug: 'diamond', emoji: '💎' },
  { label: 'Émeraude', slug: 'emerald', emoji: '💚' },
];
const EMBLEM_BASE =
  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/ranked-emblem';

/** Compact rank emblem for the daily table's rank column. */
function RankBadge({ rank }: { rank: number }) {
  const [imgFailed, setImgFailed] = useState(false);
  const tier = TIERS[rank - 1];
  if (!tier) {
    return (
      <span title="Rang inférieur" className="inline-flex size-8 items-center justify-center text-xl leading-none">
        <span aria-hidden>💩</span>
      </span>
    );
  }
  if (imgFailed) {
    return (
      <span title={tier.label} className="inline-flex size-8 items-center justify-center text-xl leading-none">
        <span aria-hidden>{tier.emoji}</span>
      </span>
    );
  }
  return (
    <span title={tier.label} className="inline-flex size-8 items-center justify-center overflow-hidden">
      <img
        src={`${EMBLEM_BASE}/emblem-${tier.slug}.png`}
        alt={tier.label}
        loading="lazy"
        onError={() => setImgFailed(true)}
        className="size-full scale-[2.2] object-contain"
      />
    </span>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-surface px-4 py-5 shadow-sm sm:px-5">{children}</section>
  );
}

interface Props {
  dateKey: string;
  mode: QuizMode;
  sessionHour: number;
  allDone: boolean;
  totalPoints: number;
  durationMs: number;
}

export function Leaderboards({ dateKey, mode, sessionHour, allDone, totalPoints, durationMs }: Props) {
  const { user } = useAuth();
  const [daily, setDaily] = useState<DailyBoard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const submittedRef = useRef<number>(-1);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      setDaily(await fetchDailyLeaderboard(dateKey, mode));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chargement impossible');
    }
  }, [dateKey, mode]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  // Reset the in-memory submit guard when the mode changes (separate boards).
  useEffect(() => {
    submittedRef.current = -1;
  }, [mode]);

  // Save (or re-save if the score improved) once the challenge is finished.
  useEffect(() => {
    if (!user || !allDone) return;
    const key = `riftexpress:submitted-pts:${sessionScoreKey(dateKey, mode, sessionHour)}:${user.id}`;
    let best = submittedRef.current;
    try {
      const stored = localStorage.getItem(key);
      if (stored != null) best = Math.max(best, Number(stored));
    } catch {
      /* ignore */
    }
    if (totalPoints <= best) {
      setStatus('saved');
      return;
    }
    setStatus('saving');
    setSaveError(null);
    submitDailyScore({ dateKey, mode, sessionHour, points: totalPoints, durationMs, user })
      .then(() => {
        submittedRef.current = totalPoints;
        try {
          localStorage.setItem(key, String(totalPoints));
        } catch {
          /* ignore */
        }
        setStatus('saved');
        return refresh();
      })
      .catch((e) => {
        setStatus('error');
        setSaveError(e instanceof Error ? e.message : "Échec de l'enregistrement");
      });
  }, [user, allDone, totalPoints, durationMs, dateKey, mode, sessionHour, refresh]);

  if (!user) {
    return (
      <Shell>
        <h2 className="font-display text-base font-extrabold tracking-tight text-ink">Classement</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Ouvre l'app depuis le <span className="font-semibold text-ink">portail Fabric</span> et
          connecte-toi pour enregistrer ton score et apparaître aux classements.
        </p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-base font-extrabold tracking-tight text-ink">
          Classement du jour
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
          par session (10h–20h)
        </span>
      </div>

      {/* Save status */}
      {status === 'saving' && <p className="mt-2 text-xs text-ink-soft">Enregistrement du score…</p>}
      {status === 'saved' && allDone && (
        <p className="mt-2 text-xs font-semibold text-match">Score enregistré ✓</p>
      )}
      {status === 'error' && (
        <p className="mt-2 text-xs text-red-600">Échec de l'enregistrement : {saveError}</p>
      )}

      <div className="mt-3">
        {error && <p className="text-sm text-ink-soft">{error}</p>}

        {/* One column per hourly session */}
        {!error && (
          <>
            {!daily && <p className="text-sm text-ink-soft">Chargement…</p>}
            {daily && daily.rows.length === 0 && (
              <p className="text-sm text-ink-soft">Aucun score aujourd'hui. Sois le premier&nbsp;!</p>
            )}
            {daily && daily.rows.length > 0 && (
              <div className="-mx-1 overflow-x-auto">
                <table className="w-full border-separate border-spacing-y-1 text-sm">
                  <thead>
                    <tr className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                      <th className="px-2 text-left">#</th>
                      <th className="px-2 text-left">Joueur</th>
                      {daily.hours.map((h) => (
                        <th key={h} className="px-2 text-right">{h}h</th>
                      ))}
                      <th className="px-2 text-right">Tot.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.rows.map((r, i) => {
                      const isMe = r.userId === user.id;
                      const cellBg = isMe ? 'bg-primary-soft' : 'bg-surface-2';
                      return (
                        <tr key={r.userId}>
                          <td className={`rounded-l-tile px-2 py-1 text-center ${cellBg}`}>
                            <RankBadge rank={i + 1} />
                          </td>
                          <td className={`max-w-[120px] truncate px-2 py-2 font-semibold text-ink ${cellBg}`}>
                            {r.userName}
                            {isMe && <span className="ml-1 text-xs font-medium text-primary">(toi)</span>}
                          </td>
                          {daily.hours.map((h) => (
                            <td key={h} className={`px-2 py-2 text-right tabular-nums text-ink-soft ${cellBg}`}>
                              {r.scores[h] ?? '·'}
                            </td>
                          ))}
                          <td className={`rounded-r-tile px-2 py-2 text-right font-display font-bold text-ink ${cellBg}`}>
                            {r.total}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Shell>
  );
}
