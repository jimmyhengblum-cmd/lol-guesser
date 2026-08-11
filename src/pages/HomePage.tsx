import { useMemo, useState } from 'react';

import { useTheme } from '@/hooks/useTheme';
import { useDdragon } from '@/ddragon/useDdragon';
import type { DdragonData } from '@/ddragon/types';
import type { QuizMode } from '@/quiz/types';
import { buildDailyQuiz } from '@/quiz/buildDaily';
import { useCurrentSession, useDailyReroll, sessionId } from '@/quiz/session';
import { useQuiz } from '@/quiz/useQuiz';
import { useAuth } from '@/hooks/AuthContext';
import { pendingReset } from '@/services/playerResets';
import { REROLL_ADMIN_EMAIL, triggerReroll } from '@/services/reroll';
import { QuizProgress } from '@/components/quiz/QuizProgress';
import { RoundView } from '@/components/quiz/RoundView';
import { Summary } from '@/components/quiz/Summary';
import { Leaderboards } from '@/components/quiz/Leaderboards';

function formatDay(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function Roundel() {
  return (
    <span className="flex size-11 items-center justify-center rounded-pill bg-primary text-primary-ink shadow-sm">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="2.4" fill="currentColor" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-center text-ink-soft">
      {children}
    </div>
  );
}

function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={dark ? 'Passer en mode clair' : 'Passer en mode sombre'}
      className="flex size-9 shrink-0 items-center justify-center rounded-pill border border-border bg-surface text-ink-soft transition-colors hover:border-primary hover:text-primary"
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="2" />
          <path
            d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

function RerollButton({ onReroll, busy }: { onReroll: () => void; busy: boolean }) {
  return (
    <button
      type="button"
      onClick={onReroll}
      disabled={busy}
      aria-label="Relancer toutes les questions (admin)"
      title="Relancer toutes les questions (admin)"
      className="flex size-9 shrink-0 items-center justify-center rounded-pill border border-border bg-surface text-ink-soft transition-colors hover:border-primary hover:text-primary disabled:opacity-40"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden
        className={busy ? 'animate-spin' : undefined}
      >
        <path
          d="M20 12a8 8 0 1 1-2.34-5.66M20 4v5h-5"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function Header({
  dateKey,
  dark,
  onToggleTheme,
  showReroll,
  rerolling,
  onReroll,
}: {
  dateKey: string;
  dark: boolean;
  onToggleTheme: () => void;
  showReroll: boolean;
  rerolling: boolean;
  onReroll: () => void;
}) {
  return (
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Roundel />
        <div className="min-w-0">
          <p className="font-display text-xl font-extrabold leading-tight tracking-tight text-ink">
            Rift Express
          </p>
          <p className="truncate text-sm font-medium capitalize text-ink-soft">
            Défi du jour · {formatDay(dateKey)}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {showReroll && <RerollButton onReroll={onReroll} busy={rerolling} />}
        <ThemeToggle dark={dark} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}

function ModeToggle({ mode, onChange }: { mode: QuizMode; onChange: (m: QuizMode) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex rounded-pill border border-border bg-surface-2 p-1 text-xs font-bold">
        <button
          type="button"
          onClick={() => onChange('normal')}
          className={`rounded-pill px-3.5 py-1.5 transition-colors ${
            mode === 'normal' ? 'bg-primary text-primary-ink' : 'text-ink-soft hover:text-ink'
          }`}
        >
          Normal
        </button>
        <button
          type="button"
          onClick={() => onChange('hardcore')}
          className={`rounded-pill px-3.5 py-1.5 transition-colors ${
            mode === 'hardcore' ? 'bg-red-600 text-white' : 'text-ink-soft hover:text-ink'
          }`}
        >
          ☠ Hardcore
        </button>
        <button
          type="button"
          onClick={() => onChange('blur')}
          className={`rounded-pill px-3.5 py-1.5 transition-colors ${
            mode === 'blur' ? 'bg-blue-600 text-white' : 'text-ink-soft hover:text-ink'
          }`}
        >
          🌫 Flou
        </button>
      </div>
      {mode === 'hardcore' && (
        <span className="text-xs font-medium text-ink-faint">
          Indices opaques, aucun cadeau — réservé aux plus tarés du jeu.
        </span>
      )}
      {mode === 'blur' && (
        <span className="text-xs font-medium text-ink-faint">
          15 rounds, rien que des images floutées — splash, skins, sorts.
        </span>
      )}
    </div>
  );
}

function Game({
  data,
  dateKey,
  sessionHour,
  reroll,
  onReroll,
  dark,
  onToggleTheme,
  mode,
  onChangeMode,
}: {
  data: DdragonData;
  dateKey: string;
  sessionHour: number;
  reroll: string;
  onReroll: () => void;
  dark: boolean;
  onToggleTheme: () => void;
  mode: QuizMode;
  onChangeMode: (m: QuizMode) => void;
}) {
  const quiz = useMemo(
    () => buildDailyQuiz(data, dateKey, mode, sessionHour, reroll),
    [data, dateKey, mode, sessionHour, reroll],
  );
  const { user } = useAuth();
  const [rerolling, setRerolling] = useState(false);
  const handleReroll = async () => {
    if (!user || rerolling) return;
    if (!window.confirm('Relancer toutes les questions maintenant, pour tout le monde ?')) return;
    setRerolling(true);
    try {
      await triggerReroll(dateKey, user.email);
      onReroll();
    } catch (err) {
      console.error('Reroll failed:', err);
    } finally {
      setRerolling(false);
    }
  };
  // Admin per-player reset: when the signed-in player has a pending reset for
  // today, their client clears local progress once (see playerResets.ts).
  const reset = pendingReset(user?.name, dateKey);
  const q = useQuiz(quiz, reset?.token ?? null);
  const round = quiz.rounds[q.current];
  // Guess rounds cap at 100; QCM rounds at 20 per question.
  const maxPoints = quiz.rounds.reduce(
    (sum, r) => sum + (r.kind === 'qcm' ? (r.qcm?.length ?? 0) * 20 : 100),
    0,
  );
  const navBtn =
    'rounded-pill border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-primary disabled:opacity-40';
  const cat =
    round.pool === 'champion'
      ? { label: 'Champion', cls: 'bg-primary-soft text-primary' }
      : round.pool === 'item'
        ? { label: 'Objet', cls: 'bg-blue-100 text-blue-700' }
        : { label: 'Éclair', cls: 'bg-amber-100 text-amber-700' };

  return (
    <div className="min-h-full px-4 py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <Header
          dateKey={dateKey}
          dark={dark}
          onToggleTheme={onToggleTheme}
          showReroll={user?.email === REROLL_ADMIN_EMAIL}
          rerolling={rerolling}
          onReroll={handleReroll}
        />

        <ModeToggle mode={mode} onChange={onChangeMode} />

        {q.ended && (
          <Summary
            rounds={quiz.rounds}
            roundPoints={q.roundPoints}
            totalPoints={q.totalPoints}
            maxPoints={maxPoints}
          />
        )}

        <QuizProgress
          rounds={quiz.rounds}
          roundDone={q.roundDone}
          current={q.current}
          totalPoints={q.totalPoints}
          onGoTo={q.goTo}
        />

        <section className="rounded-card border border-border bg-surface px-4 py-5 shadow-sm sm:px-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-pill px-2.5 py-0.5 text-xs font-bold ${cat.cls}`}>{cat.label}</span>
            <p className="font-display text-lg font-extrabold text-ink">
              {q.current + 1}. {round.label}
            </p>
          </div>
          <p className="mt-1 text-sm text-ink-soft">{round.instruction}</p>

          <div className="mt-4">
            <RoundView
              round={round}
              mode={mode}
              dateKey={dateKey}
              data={data}
              version={quiz.version}
              state={q.states[q.current]}
              done={q.roundDone[q.current]}
              onGuess={(id, correct) => q.guess(q.current, id, correct)}
              onGiveUp={() => q.giveUp(q.current)}
              onAnswerQcm={(qi, opt) => q.answerQcm(q.current, qi, opt)}
            />
          </div>

          <div className="mt-5 flex items-center justify-between">
            <button type="button" className={navBtn} disabled={q.current === 0} onClick={() => q.goTo(q.current - 1)}>
              Précédent
            </button>
            <span className="text-xs font-semibold text-ink-faint">
              {q.roundDone[q.current] ? `+${q.roundPoints[q.current]} pts` : 'en cours'}
            </span>
            <button
              type="button"
              className={navBtn}
              disabled={q.current === quiz.rounds.length - 1}
              onClick={() => q.goTo(q.current + 1)}
            >
              {q.roundDone[q.current] ? 'Suivant' : 'Passer'}
            </button>
          </div>
        </section>

        <Leaderboards
          dateKey={dateKey}
          mode={mode}
          sessionHour={sessionHour}
          allDone={q.ended}
          totalPoints={q.totalPoints}
          durationMs={q.durationMs}
        />

        <footer className="pt-2 text-center text-xs text-ink-faint">
          {data.champions.length} champions · {data.items.length} objets · données Riot Data Dragon (patch{' '}
          {data.version})
        </footer>
      </div>
    </div>
  );
}

export function HomePage() {
  const { data, error } = useDdragon();
  const session = useCurrentSession();
  const { salt: reroll, refresh: refreshReroll } = useDailyReroll(session.dateKey);
  const { dark, toggle } = useTheme();
  const [mode, setMode] = useState<QuizMode>(() => {
    try {
      const stored = localStorage.getItem('riftexpress:mode');
      return stored === 'hardcore' || stored === 'blur' ? stored : 'normal';
    } catch {
      return 'normal';
    }
  });
  const changeMode = (m: QuizMode) => {
    setMode(m);
    try {
      localStorage.setItem('riftexpress:mode', m);
    } catch {
      /* ignore */
    }
  };

  if (error) return <Centered>Impossible de charger les données du jeu : {error}</Centered>;
  if (!data) return <Centered>Chargement des données du jeu…</Centered>;
  // `key` remounts Game on a mode switch, a session change (hourly re-roll),
  // OR a manual admin reroll → a clean fresh state, no transient render with
  // stale progress.
  return (
    <Game
      key={`${mode}:${sessionId(session)}:${reroll}`}
      data={data}
      dateKey={session.dateKey}
      sessionHour={session.hour}
      reroll={reroll}
      onReroll={refreshReroll}
      dark={dark}
      onToggleTheme={toggle}
      mode={mode}
      onChangeMode={changeMode}
    />
  );
}
