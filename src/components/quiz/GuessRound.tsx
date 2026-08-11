import type { ReactNode } from 'react';

import { championImg, itemImg } from '@/ddragon/ddragon';
import type { DdragonData } from '@/ddragon/types';
import type { AnswerPool } from '@/quiz/types';
import type { RoundState } from '@/quiz/useQuiz';
import { EntityIcon } from '@/components/EntityIcon';
import { EntitySearch, type SearchOption } from '@/components/EntitySearch';
import { GiveUpButton } from './GiveUpButton';
import { RoundReveal } from './RoundReveal';

interface Props {
  pool: AnswerPool;
  data: DdragonData;
  version: string;
  targetId: string;
  state: RoundState;
  done: boolean;
  clue: ReactNode;
  /** Hide option thumbnails in the dropdown (blurred-image rounds). */
  hideOptionIcons?: boolean;
  onGuess: (id: string, correct: boolean) => void;
  onGiveUp: () => void;
}

export function GuessRound({
  pool,
  data,
  version,
  targetId,
  state,
  done,
  clue,
  hideOptionIcons,
  onGuess,
  onGiveUp,
}: Props) {
  const isChamp = pool === 'champion';

  const iconOf = (id: string): string =>
    isChamp
      ? championImg(version, data.championsById[id]?.imageFull ?? '')
      : itemImg(version, data.itemsById[id]?.imageFull ?? '');
  const nameOf = (id: string): string =>
    (isChamp ? data.championsById[id]?.name : data.itemsById[id]?.name) ?? id;

  const options: SearchOption[] = isChamp
    ? data.champions.map((c) => ({ id: c.id, name: c.name, iconUrl: championImg(version, c.imageFull) }))
    : data.items.map((it) => ({
        id: it.id,
        name: it.name,
        altName: it.nameEn, // searchable by English name too
        iconUrl: itemImg(version, it.imageFull),
      }));

  return (
    <div className="flex flex-col gap-4">
      {clue}

      {!done && (
        <div className="flex flex-col gap-2">
          <EntitySearch
            options={options}
            excludeIds={new Set(state.guessedIds)}
            disabled={false}
            hideIcons={hideOptionIcons}
            placeholder={isChamp ? 'Tape un champion…' : 'Tape un objet…'}
            onPick={(o) => onGuess(o.id, o.id === targetId)}
          />
          <GiveUpButton onClick={onGiveUp} />
        </div>
      )}

      {done && <RoundReveal name={nameOf(targetId)} iconUrl={iconOf(targetId)} solved={state.solved} />}

      {state.guessedIds.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {state.guessedIds.map((id) => {
            const correct = id === targetId;
            return (
              <li
                key={id}
                className={`flex items-center gap-2 rounded-tile px-3 py-2 ${
                  correct ? 'bg-match/15' : 'bg-surface-2'
                }`}
              >
                <EntityIcon src={iconOf(id)} name={nameOf(id)} size={28} />
                <span className="font-semibold text-ink">{nameOf(id)}</span>
                <span className={`ml-auto font-bold ${correct ? 'text-match' : 'text-ink-faint'}`}>
                  {correct ? '✓' : '✗'}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
