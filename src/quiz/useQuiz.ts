import { useCallback, useMemo, useState } from 'react';

import { guessRoundPoints, qcmPoints } from './scoring';
import type { DailyQuiz } from './types';

export interface RoundState {
  wrong: number;
  solved: boolean;
  gaveUp: boolean;
  guessedIds: string[];
  qcmAnswers: (number | null)[];
}

interface Persisted {
  startedAt: number | null;
  current: number;
  states: RoundState[];
  finished?: boolean;
}

function freshStates(quiz: DailyQuiz): RoundState[] {
  return quiz.rounds.map((r) => ({
    wrong: 0,
    solved: false,
    gaveUp: false,
    guessedIds: [],
    qcmAnswers: r.kind === 'qcm' && r.qcm ? r.qcm.map(() => null) : [],
  }));
}

// Stable namespace — bump ONLY when the `Persisted` shape changes (a content
// re-roll is handled by `drawId`, not by churning this). Progress is keyed by
// day + draw so a plain refresh always restores answers + the wrong-guess
// penalty; the game only resets when the questions are deliberately re-rolled.
const QUIZ_NS = 'quiz2';
function storageKey(quiz: DailyQuiz): string {
  return `riftexpress:${QUIZ_NS}:${quiz.dateKey}:${quiz.drawId}:${quiz.mode}`;
}

function load(quiz: DailyQuiz): Persisted {
  try {
    const raw = localStorage.getItem(storageKey(quiz));
    if (raw) {
      const parsed = JSON.parse(raw) as Persisted;
      // Guard against shape drift (e.g. roster changed mid-day).
      if (parsed.states?.length === quiz.rounds.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  return { startedAt: null, current: 0, states: freshStates(quiz), finished: false };
}

/**
 * Admin per-player reset: if `resetToken` is set and hasn't been consumed on
 * this device yet, wipe today's saved progress + the submit guards (so a fresh
 * replay can be re-submitted), mark the token consumed, and start clean. Runs
 * at most once per token. Returns true when it reset.
 */
function consumeResetIfPending(quiz: DailyQuiz, resetToken: string | null | undefined): boolean {
  if (!resetToken) return false;
  const consumedKey = `riftexpress:reset-consumed:${resetToken}`;
  try {
    if (localStorage.getItem(consumedKey)) return false;
    localStorage.removeItem(storageKey(quiz));
    // Clear the "already submitted" guards so the replay's score can be saved.
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith('riftexpress:submitted-pts:')) localStorage.removeItem(k);
    }
    localStorage.setItem(consumedKey, '1');
    return true;
  } catch {
    return false;
  }
}

export interface QuizController {
  current: number;
  states: RoundState[];
  roundPoints: number[];
  totalPoints: number;
  roundDone: boolean[];
  allDone: boolean;
  /** True once every round is naturally done OR the player tapped "Terminer". */
  ended: boolean;
  durationMs: number;
  goTo: (index: number) => void;
  /** Finalize the challenge now — unfinished rounds keep their current points. */
  finish: () => void;
  /** Record a guess in a guess-round; returns whether it was correct. */
  guess: (index: number, guessedId: string, correct: boolean) => void;
  giveUp: (index: number) => void;
  answerQcm: (index: number, questionIndex: number, optionIndex: number) => void;
}

export function useQuiz(quiz: DailyQuiz, resetToken?: string | null): QuizController {
  // Identity of the current quiz. When it changes (day / draw / MODE / reset),
  // reset the state DURING render — so `data` is never paired with a stale quiz
  // for a frame. The old effect-based reload left a transient render where a
  // freshly-switched mode was matched with the *previous* mode's (often
  // completed) states, which submitted a bogus score before playing.
  const quizKey = `${quiz.dateKey}:${quiz.drawId}:${quiz.mode}:${resetToken ?? ''}`;
  const [snapshot, setSnapshot] = useState<{ key: string; data: Persisted }>(() => {
    consumeResetIfPending(quiz, resetToken);
    return { key: quizKey, data: load(quiz) };
  });
  if (snapshot.key !== quizKey) {
    consumeResetIfPending(quiz, resetToken);
    setSnapshot({ key: quizKey, data: load(quiz) });
  }
  const data = snapshot.data;

  const persist = useCallback(
    (next: Persisted) => {
      setSnapshot((prev) => ({ key: prev.key, data: next }));
      try {
        localStorage.setItem(storageKey(quiz), JSON.stringify(next));
      } catch {
        /* ignore */
      }
    },
    [quiz],
  );

  const ensureStarted = (p: Persisted): number => p.startedAt ?? Date.now();

  const guess = useCallback(
    (index: number, guessedId: string, correct: boolean) => {
      const states = data.states.map((s, i) => {
        if (i !== index || s.solved || s.gaveUp) return s;
        if (s.guessedIds.includes(guessedId)) return s;
        return {
          ...s,
          guessedIds: [guessedId, ...s.guessedIds],
          wrong: correct ? s.wrong : s.wrong + 1,
          solved: correct ? true : s.solved,
        };
      });
      persist({ ...data, startedAt: ensureStarted(data), states });
    },
    [data, persist],
  );

  const giveUp = useCallback(
    (index: number) => {
      const states = data.states.map((s, i) =>
        i === index && !s.solved ? { ...s, gaveUp: true } : s,
      );
      persist({ ...data, startedAt: ensureStarted(data), states });
    },
    [data, persist],
  );

  const answerQcm = useCallback(
    (index: number, questionIndex: number, optionIndex: number) => {
      const states = data.states.map((s, i) => {
        if (i !== index) return s;
        if (s.qcmAnswers[questionIndex] != null) return s; // lock once answered
        const qcmAnswers = s.qcmAnswers.slice();
        qcmAnswers[questionIndex] = optionIndex;
        return { ...s, qcmAnswers };
      });
      persist({ ...data, startedAt: ensureStarted(data), states });
    },
    [data, persist],
  );

  const goTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(quiz.rounds.length - 1, index));
      persist({ ...data, current: clamped });
    },
    [data, persist, quiz.rounds.length],
  );

  const finish = useCallback(() => {
    persist({ ...data, finished: true, startedAt: ensureStarted(data) });
  }, [data, persist]);

  const roundPoints = useMemo(
    () =>
      quiz.rounds.map((round, i) => {
        const s = data.states[i];
        if (round.kind === 'qcm' && round.qcm) {
          const correct = round.qcm.reduce(
            (acc, q, qi) => acc + (s.qcmAnswers[qi] === q.answerIndex ? 1 : 0),
            0,
          );
          return qcmPoints(correct);
        }
        return guessRoundPoints(s.wrong, s.solved);
      }),
    [quiz.rounds, data.states],
  );

  const roundDone = useMemo(
    () =>
      quiz.rounds.map((round, i) => {
        const s = data.states[i];
        if (round.kind === 'qcm') return s.qcmAnswers.every((a) => a != null);
        return s.solved || s.gaveUp;
      }),
    [quiz.rounds, data.states],
  );

  const totalPoints = roundPoints.reduce((a, b) => a + b, 0);
  const allDone = roundDone.every(Boolean);
  const ended = allDone || Boolean(data.finished);
  const durationMs = ended && data.startedAt ? Math.max(0, Date.now() - data.startedAt) : 0;

  return {
    current: data.current,
    states: data.states,
    roundPoints,
    totalPoints,
    roundDone,
    allDone,
    ended,
    durationMs,
    goTo,
    finish,
    guess,
    giveUp,
    answerQcm,
  };
}
