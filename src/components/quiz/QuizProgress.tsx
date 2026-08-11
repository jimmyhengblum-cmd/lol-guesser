import type { DailyRound } from '@/quiz/types';

interface Props {
  rounds: DailyRound[];
  roundDone: boolean[];
  current: number;
  totalPoints: number;
  onGoTo: (index: number) => void;
}

export function QuizProgress({ rounds, roundDone, current, totalPoints, onGoTo }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold uppercase tracking-wide text-ink-soft">
          Manche {current + 1}/{rounds.length}
        </p>
        <p className="font-display text-sm font-extrabold text-primary">{totalPoints} pts</p>
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {rounds.map((r, i) => {
          const active = i === current;
          const done = roundDone[i];
          const cls = active
            ? 'bg-primary text-primary-ink'
            : done
              ? 'bg-match/20 text-match'
              : 'bg-surface-2 text-ink-soft hover:bg-surface';
          return (
            <button
              key={i}
              type="button"
              onClick={() => onGoTo(i)}
              title={r.label}
              aria-label={`Manche ${i + 1} : ${r.label}`}
              className={`flex size-9 shrink-0 items-center justify-center rounded-pill text-sm font-bold transition-colors ${cls}`}
            >
              {done && !active ? '✓' : i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}
