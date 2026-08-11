import type { QcmQuestion } from '@/quiz/types';
import { EntityIcon } from '@/components/EntityIcon';

interface Props {
  questions: QcmQuestion[];
  answers: (number | null)[];
  onAnswer: (questionIndex: number, optionIndex: number) => void;
}

export function QcmRound({ questions, answers, onAnswer }: Props) {
  return (
    <div className="flex flex-col gap-4">
      {questions.map((q, qi) => {
        const chosen = answers[qi];
        const answered = chosen != null;
        return (
          <div key={qi} className="rounded-card border border-border bg-surface p-4">
            <p className="font-display font-bold text-ink">
              {qi + 1}. {q.prompt}
            </p>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {q.options.map((opt, oi) => {
                const isAnswer = oi === q.answerIndex;
                const isChosen = oi === chosen;
                // After answering: correct option fills green, the player's
                // wrong pick fills red, the rest dim. Explicit palette colors
                // (not theme tokens) so the fill is guaranteed in any bundle.
                let cls = 'border-border bg-surface text-ink hover:border-primary';
                if (answered) {
                  if (isAnswer) cls = 'border-2 border-emerald-600 bg-emerald-600 text-white';
                  else if (isChosen) cls = 'border-2 border-red-600 bg-red-600 text-white';
                  else cls = 'border-border bg-surface text-ink opacity-50';
                }
                return (
                  <button
                    key={oi}
                    type="button"
                    aria-disabled={answered}
                    onClick={() => {
                      if (!answered) onAnswer(qi, oi);
                    }}
                    className={`flex items-center gap-2 rounded-tile border px-3 py-2 text-left text-sm font-semibold transition-colors ${
                      answered ? 'cursor-default' : ''
                    } ${cls}`}
                  >
                    <EntityIcon src={opt.iconUrl} name={opt.label} size={30} />
                    <span className="flex-1 truncate">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
