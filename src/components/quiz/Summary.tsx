import type { DailyRound } from '@/quiz/types';

interface Props {
  rounds: DailyRound[];
  roundPoints: number[];
  totalPoints: number;
  maxPoints: number;
}

export function Summary({ rounds, roundPoints, totalPoints, maxPoints }: Props) {
  return (
    <div className="rounded-card border border-primary/40 bg-primary-soft px-6 py-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Défi du jour terminé</p>
      <p className="mt-1 font-display text-4xl font-extrabold text-primary">
        {totalPoints}
        <span className="text-xl font-bold text-ink-soft">/{maxPoints} pts</span>
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {rounds.map((r, i) => (
          <span key={i} className="rounded-pill bg-surface px-2.5 py-1 text-xs font-semibold text-ink">
            {r.label} · {roundPoints[i]}
          </span>
        ))}
      </div>
      <p className="mt-4 text-sm text-ink-soft">Ton score est enregistré au classement ci-dessous.</p>
    </div>
  );
}
