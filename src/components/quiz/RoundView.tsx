import { useEffect, useState } from 'react';

import {
  championImg,
  itemImg,
  loadChampionDetail,
  spellImg,
  splashImg,
  stripHtml,
} from '@/ddragon/ddragon';
import { itemEffectText } from '@/ddragon/stats';
import type { ChampionDetail, DdragonData } from '@/ddragon/types';
import { rngFrom } from '@/quiz/rng';
import { META_BY_ID } from '@/quiz/championMeta';
import type { DailyRound, QuizMode } from '@/quiz/types';
import type { RoundState } from '@/quiz/useQuiz';
import { EntityIcon } from '@/components/EntityIcon';
import { ChampAttributesRound } from './ChampAttributesRound';
import { GuessRound } from './GuessRound';
import { QcmRound } from './QcmRound';

const ROLE_FR: Record<string, string> = {
  Fighter: 'Combattant',
  Tank: 'Tank',
  Mage: 'Mage',
  Assassin: 'Assassin',
  Support: 'Support',
  Marksman: 'Tireur',
};

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function mask(text: string, word: string): string {
  if (!word) return text;
  return text.replace(new RegExp(escapeRegex(word), 'gi'), '▒▒▒');
}

/**
 * Image zoomed-in + blurred, revealing as `scale`→1 / `blur`→0. Uses a real
 * <img> so a failed URL (e.g. a missing skin splash) falls back to `fallbackSrc`
 * instead of leaving an empty frame. `originX/originY` focus the zoom.
 */
function ZoomImage({
  src,
  fallbackSrc,
  scale,
  blur,
  originX,
  originY,
  className,
}: {
  src: string;
  fallbackSrc?: string;
  scale: number;
  blur: number;
  originX: number;
  originY: number;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const url = errored && fallbackSrc ? fallbackSrc : src;
  return (
    <div className={`overflow-hidden bg-surface-2 ${className ?? ''}`}>
      <img
        src={url}
        alt=""
        aria-hidden
        onError={() => {
          if (fallbackSrc && !errored) setErrored(true);
        }}
        className="size-full object-cover transition-all duration-300"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: `${originX}% ${originY}%`,
          filter: blur > 0 ? `blur(${blur}px)` : undefined,
        }}
      />
    </div>
  );
}

function ClueCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-border bg-surface px-4 py-5 shadow-sm sm:px-5">{children}</div>
  );
}

interface Props {
  round: DailyRound;
  mode: QuizMode;
  dateKey: string;
  data: DdragonData;
  version: string;
  state: RoundState;
  done: boolean;
  onGuess: (id: string, correct: boolean) => void;
  onGiveUp: () => void;
  onAnswerQcm: (questionIndex: number, optionIndex: number) => void;
}

export function RoundView({
  round,
  mode,
  dateKey,
  data,
  version,
  state,
  done,
  onGuess,
  onGiveUp,
  onAnswerQcm,
}: Props) {
  const needsDetail =
    round.kind === 'champ-spell' ||
    round.kind === 'champ-description' ||
    round.kind === 'champ-passive' ||
    round.kind === 'champ-abilities' ||
    round.kind === 'champ-lore' ||
    round.kind === 'champ-spell-numbers' ||
    round.kind === 'champ-skin-splash';
  const [detail, setDetail] = useState<ChampionDetail | null>(null);

  useEffect(() => {
    setDetail(null);
    if (needsDetail && round.targetId) {
      let cancelled = false;
      loadChampionDetail(round.targetId)
        .then((d) => {
          if (!cancelled) setDetail(d);
        })
        .catch(() => {
          /* leave null — clue shows a loading note */
        });
      return () => {
        cancelled = true;
      };
    }
  }, [needsDetail, round.targetId]);

  // ---- QCM ----
  if (round.kind === 'qcm' && round.qcm) {
    return <QcmRound questions={round.qcm} answers={state.qcmAnswers} onAnswer={onAnswerQcm} />;
  }

  if (!round.targetId || !round.pool) return null;

  // ---- Champion attributes ----
  if (round.kind === 'champ-attributes') {
    return (
      <ChampAttributesRound
        data={data}
        version={version}
        targetId={round.targetId}
        state={state}
        done={done}
        onGuess={onGuess}
        onGiveUp={onGiveUp}
      />
    );
  }

  const champ = round.pool === 'champion' ? data.championsById[round.targetId] : undefined;
  const item = round.pool === 'item' ? data.itemsById[round.targetId] : undefined;

  let clue: React.ReactNode = null;

  if (round.kind === 'champ-title' && champ) {
    clue = (
      <ClueCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Titre du champion</p>
        <p className="mt-2 font-display text-2xl font-extrabold capitalize text-ink">« {champ.title} »</p>
        {champ.titleEn && champ.titleEn !== champ.title && (
          <p className="mt-1 font-display text-lg font-bold capitalize text-ink-soft">« {champ.titleEn} »</p>
        )}
      </ClueCard>
    );
  } else if (round.kind === 'champ-blur' && champ) {
    // Hardcore: starts near-opaque (26px) and barely clears (−2/err); normal: 14px, −3/err.
    const blur = done ? 0 : round.hard ? Math.max(2, 26 - state.wrong * 2) : Math.max(0, 14 - state.wrong * 3);
    clue = (
      <ClueCard>
        <div className="flex justify-center">
          <EntityIcon
            src={championImg(version, champ.imageFull)}
            name={champ.name}
            size={140}
            style={{ filter: `blur(${blur}px)` }}
          />
        </div>
        <p className="mt-3 text-center text-xs text-ink-faint">
          Le portrait se précise à chaque erreur.
        </p>
      </ClueCard>
    );
  } else if (round.kind === 'item-blur' && item) {
    const blur = done ? 0 : Math.max(0, 14 - state.wrong * 3);
    clue = (
      <ClueCard>
        <div className="flex justify-center">
          <EntityIcon
            src={itemImg(version, item.imageFull)}
            name={item.name}
            size={120}
            style={{ filter: `blur(${blur}px)` }}
          />
        </div>
        <p className="mt-3 text-center text-xs text-ink-faint">L'icône se précise à chaque erreur.</p>
      </ClueCard>
    );
  } else if (round.kind === 'item-effect' && item) {
    const effect = mask(itemEffectText(item.description), item.name);
    clue = (
      <ClueCard>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Effet de l'objet</p>
          <p className="shrink-0 font-display text-sm font-extrabold text-primary">{item.goldTotal} or</p>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-ink">{effect || '—'}</p>
      </ClueCard>
    );
  } else if (round.kind === 'champ-rebus') {
    clue = (
      <ClueCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Emoji — concept du champion
        </p>
        <p className="mt-3 text-center text-5xl leading-snug tracking-widest">{round.clueText}</p>
      </ClueCard>
    );
  } else if (round.kind === 'champ-origin') {
    clue = (
      <ClueCard>
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Origine</p>
        <p className="mt-2 font-display text-lg font-extrabold text-ink">{round.clueText}</p>
      </ClueCard>
    );
  } else if (round.kind === 'champ-splash' && champ) {
    const r = rngFrom(`${dateKey}:zoom:${champ.id}`);
    const originX = 15 + Math.floor(r() * 70);
    const originY = 15 + Math.floor(r() * 70);
    const scale = done ? 1 : Math.max(1, 3.6 - state.wrong * 0.45);
    const blur = done ? 0 : Math.max(0, 7 - state.wrong * 1.3);
    clue = (
      <ClueCard>
        <ZoomImage
          src={splashImg(champ.id, 0)}
          fallbackSrc={championImg(version, champ.imageFull)}
          scale={scale}
          blur={blur}
          originX={originX}
          originY={originY}
          className="h-44 w-full rounded-tile"
        />
        <p className="mt-3 text-center text-xs text-ink-faint">Splash zoomé + flouté — se précise à chaque erreur.</p>
      </ClueCard>
    );
  } else if (round.kind === 'item-build' && item) {
    clue = (
      <ClueCard>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Se construit à partir de</p>
          <p className="shrink-0 font-display text-sm font-extrabold text-primary">{item.goldTotal} or</p>
        </div>
        <p className="mt-2 font-display text-lg font-extrabold text-ink">{round.clueText}</p>
      </ClueCard>
    );
  } else if (needsDetail) {
    if (!detail) {
      clue = (
        <ClueCard>
          <p className="text-sm text-ink-soft">Chargement…</p>
        </ClueCard>
      );
    } else {
      const idx = Math.floor(rngFrom(`${dateKey}:spellpick:${round.targetId}`)() * detail.spells.length);
      const spell = detail.spells[idx] ?? detail.spells[0];
      if (round.kind === 'champ-spell' && round.hideName) {
        // Hardcore: spell icon zoomed-in + blurred — clears on errors.
        clue = (
          <ClueCard>
            <div className="flex flex-col items-center gap-2">
              <ZoomImage
                src={spellImg(version, spell.imageFull)}
                scale={done ? 1 : Math.max(1, 3 - state.wrong * 0.4)}
                blur={done ? 0 : Math.max(0, 4.5 - state.wrong * 0.8)}
                originX={50}
                originY={50}
                className="size-28 rounded-tile"
              />
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Icône de sort (zoomée + floutée)</p>
            </div>
          </ClueCard>
        );
      } else if (round.kind === 'champ-spell') {
        clue = (
          <ClueCard>
            <div className="flex items-center gap-3">
              <EntityIcon src={spellImg(version, spell.imageFull)} name={spell.name} size={56} />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  Sort ({spell.slot})
                </p>
                <p className="font-display text-lg font-extrabold text-ink">{spell.name}</p>
                {spell.nameEn && spell.nameEn !== spell.name && (
                  <p className="text-sm font-semibold text-ink-soft">{spell.nameEn}</p>
                )}
              </div>
            </div>
          </ClueCard>
        );
      } else if (round.kind === 'champ-spell-numbers') {
        clue = (
          <ClueCard>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Chiffres d'un sort ({spell.slot})
            </p>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              <li className="flex justify-between rounded-tile bg-surface-2 px-3 py-1.5">
                <span className="text-ink-soft">Cooldown</span>
                <span className="font-semibold text-ink">{spell.cooldownBurn} s</span>
              </li>
              <li className="flex justify-between rounded-tile bg-surface-2 px-3 py-1.5">
                <span className="text-ink-soft">Coût</span>
                <span className="font-semibold text-ink">{spell.costBurn || '—'}</span>
              </li>
              <li className="flex justify-between rounded-tile bg-surface-2 px-3 py-1.5">
                <span className="text-ink-soft">Portée</span>
                <span className="font-semibold text-ink">{spell.rangeBurn}</span>
              </li>
            </ul>
            <p className="mt-3 text-xs text-ink-soft">
              <span className="font-semibold text-ink-faint">Indice — </span>
              Classe&nbsp;: {detail.tags.map((t) => ROLE_FR[t] ?? t).join(' / ') || '—'} · Ressource&nbsp;:{' '}
              {detail.partype || 'Aucune'}
            </p>
          </ClueCard>
        );
      } else if (round.kind === 'champ-lore') {
        const text = stripHtml(detail.blurb ?? '');
        // Skip the opening (often names the role/region) → take a mid slice.
        const start = text.length > 110 ? 90 : 0;
        const snippet = text.slice(start, start + 340);
        const region = META_BY_ID[detail.id]?.region ?? '';
        const masked = mask(mask(snippet || text, detail.name), region);
        clue = (
          <ClueCard>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">Extrait de lore</p>
            <p className="mt-2 text-sm leading-relaxed text-ink">… {masked} …</p>
          </ClueCard>
        );
      } else if (round.kind === 'champ-skin-splash') {
        const r = rngFrom(`${dateKey}:skin:${detail.id}`);
        const skins = (detail.skins ?? []).filter((s) => s.num !== 0);
        const skin = skins.length > 0 ? skins[Math.floor(r() * skins.length)] : { num: 0 };
        const originX = 15 + Math.floor(r() * 70);
        const originY = 15 + Math.floor(r() * 70);
        const scale = done ? 1 : Math.max(1, 3.6 - state.wrong * 0.45);
        const blur = done ? 0 : Math.max(0, 8 - state.wrong * 1.4);
        clue = (
          <ClueCard>
            <ZoomImage
              src={splashImg(detail.id, skin.num)}
              fallbackSrc={splashImg(detail.id, 0)}
              scale={scale}
              blur={blur}
              originX={originX}
              originY={originY}
              className="h-44 w-full rounded-tile"
            />
            <p className="mt-3 text-center text-xs text-ink-faint">Splash de skin zoomé + flouté — se précise à chaque erreur.</p>
          </ClueCard>
        );
      } else if (round.kind === 'champ-passive') {
        const masked = mask(mask(stripHtml(detail.passive.description), detail.name), detail.passive.name);
        clue = (
          <ClueCard>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Passif (nom masqué)
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{masked || '—'}</p>
          </ClueCard>
        );
      } else if (round.kind === 'champ-abilities') {
        const names = detail.spells.map((s) => mask(s.name, detail.name));
        clue = (
          <ClueCard>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Les 4 sorts de ce champion
            </p>
            <ul className="mt-3 flex flex-col gap-1.5">
              {names.map((n, i) => (
                <li key={i} className="flex items-center gap-2 rounded-tile bg-surface-2 px-3 py-1.5 text-sm">
                  <span className="font-display font-bold text-primary">{detail.spells[i]?.slot ?? '·'}</span>
                  <span className="font-semibold text-ink">{n}</span>
                </li>
              ))}
            </ul>
          </ClueCard>
        );
      } else {
        const masked = mask(mask(stripHtml(spell.description), detail.name), spell.name);
        clue = (
          <ClueCard>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
              Description d'une aptitude
            </p>
            <p className="mt-2 text-sm leading-relaxed text-ink">{masked || '—'}</p>
          </ClueCard>
        );
      }
    }
  }

  return (
    <GuessRound
      pool={round.pool}
      data={data}
      version={version}
      targetId={round.targetId}
      state={state}
      done={done}
      clue={clue}
      // Image rounds: hide the dropdown thumbnails (else you'd match the
      // blurred/zoomed art to the icon in the list) — except in "blur" mode,
      // which keeps them visible on purpose.
      hideOptionIcons={
        mode !== 'blur' &&
        (round.kind === 'champ-blur' ||
          round.kind === 'item-blur' ||
          round.kind === 'champ-splash' ||
          round.kind === 'champ-skin-splash')
      }
      onGuess={onGuess}
      onGiveUp={onGiveUp}
    />
  );
}
