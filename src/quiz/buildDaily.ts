import type { DdragonData, SummonerSpell } from '@/ddragon/types';
import { championImg, itemImg, spellImg } from '@/ddragon/ddragon';
import { hasItemEffect } from '@/ddragon/stats';
import { REBUS } from '@/data/rebus';
import { CHAMPION_META, GENDER_FR } from './championMeta';
import { pick, rngFrom, sample } from './rng';
import type { DailyQuiz, DailyRound, QcmQuestion, QuizMode } from './types';

/**
 * Draw salt. The daily quiz is deterministic from the date, so to "re-roll"
 * today's questions (without waiting for tomorrow) bump this value — it is
 * mixed into every RNG seed, yielding a fresh set of champions/items/QCM for
 * the same calendar day. It does NOT affect leaderboard keys or storage keys
 * (those still key off the real date) — bump the quiz namespace in useQuiz.ts
 * alongside it so players actually see the new draw instead of stale progress.
 */
const DRAW = '4';
// Hardcore-only re-roll salt. Bump to draw fresh HARDCORE questions without
// touching normal mode (it feeds both the hardcore seed and its drawId, so
// hardcore progress resets too).
const HC_DRAW = '3';
// Blur-only re-roll salt (same idea as HC_DRAW, but for "blur" mode).
const BLUR_DRAW = '1';
const drawKey = (dateKey: string) => (DRAW ? `${dateKey}~d${DRAW}` : dateKey);

/** Champion class tags → FR (for the origin clue). */
const ROLE_FR: Record<string, string> = {
  Fighter: 'Combattant',
  Tank: 'Tank',
  Mage: 'Mage',
  Assassin: 'Assassin',
  Support: 'Support',
  Marksman: 'Tireur',
};

/** "<fr> / <en>" when the two differ (items), else just the FR name (champions). */
function biLabel(fr: string, en: string): string {
  return en && en !== fr ? `${fr} / ${en}` : fr;
}

function maxIndex<T>(arr: T[], metric: (t: T) => number): number {
  let best = 0;
  for (let i = 1; i < arr.length; i++) {
    if (metric(arr[i]) > metric(arr[best])) best = i;
  }
  return best;
}

/** True when exactly one option holds the max value of `metric` (no top tie). */
export function hasUniqueMax<T>(arr: T[], metric: (t: T) => number): boolean {
  const best = metric(arr[maxIndex(arr, metric)]);
  return arr.filter((o) => metric(o) === best).length === 1;
}

/**
 * Like `sample`, but guarantees the top-scoring option (by `metric`) is
 * STRICTLY unique — no tie for the winning value. QCM answers must be
 * unambiguous: with metrics that have many equal values (release year,
 * difficulty 1–10, item stats, summoner cooldowns/levels) a plain sample can
 * tie at the top, and `maxIndex` only accepts the first such option — so a
 * player clicking the *other* correct answer would be marked wrong. We re-draw
 * with a salted (still deterministic) seed until the winner is unique, then
 * fall back to the first draw after a bounded number of tries (effectively
 * never reached when drawing 4 of ~170).
 */
export function uniqueSample<T>(pool: T[], n: number, seed: string, metric: (t: T) => number): T[] {
  const MAX_TRIES = 24;
  let fallback: T[] | null = null;
  for (let attempt = 0; attempt < MAX_TRIES; attempt++) {
    const opts = sample(pool, n, rngFrom(`${seed}#u${attempt}`));
    if (fallback === null) fallback = opts;
    if (hasUniqueMax(opts, metric)) return opts;
  }
  return fallback ?? sample(pool, n, rngFrom(seed));
}

function champMaxQ(
  data: DdragonData,
  seed: string,
  prompt: string,
  metric: (c: DdragonData['champions'][number]) => number,
): QcmQuestion {
  const opts = uniqueSample(data.champions, 4, seed, metric);
  return {
    prompt,
    options: opts.map((c) => ({ label: c.name, iconUrl: championImg(data.version, c.imageFull) })),
    answerIndex: maxIndex(opts, metric),
  };
}

function itemGoldQ(data: DdragonData, seed: string): QcmQuestion {
  const metric = (i: DdragonData['items'][number]) => i.goldTotal;
  const opts = uniqueSample(data.items, 4, seed, metric);
  return {
    prompt: 'Quel objet coûte le plus cher ?',
    options: opts.map((i) => ({ label: biLabel(i.name, i.nameEn), iconUrl: itemImg(data.version, i.imageFull) })),
    answerIndex: maxIndex(opts, metric),
  };
}

function itemStatQ(
  data: DdragonData,
  seed: string,
  statKey: string,
  label: string,
): QcmQuestion | null {
  const pool = data.items.filter((it) => (it.stats[statKey] ?? 0) > 0);
  if (pool.length < 4) return null;
  const metric = (i: DdragonData['items'][number]) => i.stats[statKey] ?? 0;
  const opts = uniqueSample(pool, 4, seed, metric);
  return {
    prompt: `Quel objet donne le plus de ${label} ?`,
    options: opts.map((i) => ({ label: biLabel(i.name, i.nameEn), iconUrl: itemImg(data.version, i.imageFull) })),
    answerIndex: maxIndex(opts, metric),
  };
}

/** Like champMaxQ but the answer is the MINIMUM of the metric. */
function champMinQ(
  data: DdragonData,
  seed: string,
  prompt: string,
  metric: (c: DdragonData['champions'][number]) => number,
): QcmQuestion {
  return champMaxQ(data, seed, prompt, (c) => -metric(c));
}

function buildQcm(data: DdragonData, seed: string): QcmQuestion[] {
  const candidates: Array<QcmQuestion | null> = [
    champMaxQ(data, `${seed}:q1`, "Lequel a la plus grande portée d'attaque ?", (c) => c.attackrange),
    itemGoldQ(data, `${seed}:q2`),
    champMaxQ(data, `${seed}:q3`, 'Lequel est réputé le plus difficile à maîtriser ?', (c) => c.difficulty),
    itemStatQ(data, `${seed}:q4`, 'FlatPhysicalDamageMod', "dégâts d'attaque"),
    itemStatQ(data, `${seed}:q5`, 'FlatHPPoolMod', 'Vie'),
  ];
  return candidates.map((q, i) => q ?? itemGoldQ(data, `${seed}:qf${i}`));
}

/** QCM over summoner spells (cooldown / unlock level). */
function summonerQ(
  data: DdragonData,
  seed: string,
  prompt: string,
  metric: (s: SummonerSpell) => number,
  pickMin = false,
): QcmQuestion {
  const eff = (s: SummonerSpell) => (pickMin ? -metric(s) : metric(s));
  const opts = uniqueSample(data.summoners, 4, seed, eff);
  return {
    prompt,
    options: opts.map((s) => ({ label: s.name, iconUrl: spellImg(data.version, s.imageFull) })),
    answerIndex: maxIndex(opts, eff),
  };
}

/** QCM: which of 4 champions was released first (oldest releaseYear). */
function releaseQ(data: DdragonData, seed: string): QcmQuestion {
  const pool = CHAMPION_META.filter((m) => data.championsById[m.id]);
  const metric = (m: (typeof CHAMPION_META)[number]) => -m.releaseYear; // smallest year = oldest
  const opts = uniqueSample(pool, 4, seed, metric);
  return {
    prompt: 'Lequel est sorti en premier ?',
    options: opts.map((m) => ({
      label: data.championsById[m.id].name,
      iconUrl: championImg(data.version, data.championsById[m.id].imageFull),
    })),
    answerIndex: maxIndex(opts, metric),
  };
}

function attrTarget(data: DdragonData, seed: string): string {
  // The attribute round uses the curated metadata roster (region/gender/species/year).
  const metaInDdragon = CHAMPION_META.filter((m) => data.championsById[m.id]);
  return pick(metaInDdragon.length ? metaInDdragon : CHAMPION_META, rngFrom(`${seed}:attr`)).id;
}

/** Normal mode — the standard 8 rounds. */
function buildNormalRounds(data: DdragonData, seed: string): DailyRound[] {
  const champs = sample(data.champions, 4, rngFrom(`${seed}:champs`));
  const effectItems = data.items.filter(hasItemEffect);
  const itemEffect = pick(effectItems.length ? effectItems : data.items, rngFrom(`${seed}:item-effect`));
  const itemBlur = pick(data.items, rngFrom(`${seed}:item-blur`));

  return [
    { kind: 'champ-attributes', label: 'Attributs', instruction: 'Devine le champion à partir de ses attributs.', pool: 'champion', targetId: attrTarget(data, seed) },
    { kind: 'champ-spell', label: 'Sort', instruction: "Devine le champion à partir d'un de ses sorts.", pool: 'champion', targetId: champs[0].id },
    { kind: 'champ-description', label: 'Aptitude', instruction: "Devine le champion à partir de la description d'une aptitude.", pool: 'champion', targetId: champs[1].id },
    { kind: 'champ-title', label: 'Titre', instruction: 'Devine le champion à partir de son titre.', pool: 'champion', targetId: champs[2].id },
    { kind: 'champ-blur', label: 'Portrait', instruction: 'Devine le champion : son portrait se révèle à chaque erreur.', pool: 'champion', targetId: champs[3].id },
    { kind: 'item-effect', label: 'Objet · effet', instruction: "Devine l'objet à partir de son effet (passif/actif).", pool: 'item', targetId: itemEffect.id },
    { kind: 'item-blur', label: 'Objet · icône', instruction: "Devine l'objet : son icône se révèle à chaque erreur.", pool: 'item', targetId: itemBlur.id },
    { kind: 'qcm', label: 'Éclair', instruction: '5 questions éclair : choisis la bonne réponse.', pool: null, targetId: null, qcm: buildQcm(data, seed) },
  ];
}

/** Hardcore mode — 13 subtle "insider" rounds for the truly obsessed. */
function buildHardcoreRounds(data: DdragonData, seed: string): DailyRound[] {
  // 6 generic champions: lore, skin-splash, spell-numbers, passive, splash, spell-icon.
  const champs = sample(data.champions, 6, rngFrom(`${seed}:hc-champs`));
  const rebus = pick(
    REBUS.filter((r) => data.championsById[r.id]).length
      ? REBUS.filter((r) => data.championsById[r.id])
      : REBUS,
    rngFrom(`${seed}:hc-rebus`),
  );
  const origin = pick(
    CHAMPION_META.filter((m) => data.championsById[m.id]),
    rngFrom(`${seed}:hc-origin`),
  );
  const buildItems = data.items.filter(
    (it) => it.from.length >= 2 && it.from.every((c) => data.itemsById[c]),
  );
  const itemBuild = pick(buildItems.length ? buildItems : data.items, rngFrom(`${seed}:hc-build`));
  const components = itemBuild.from
    .map((c) => data.itemsById[c]?.name)
    .filter(Boolean)
    .join('  +  ');

  // Origin clue: region · species · gender · class (a mini-profile).
  const originClasses = (data.championsById[origin.id]?.tags ?? [])
    .map((t) => ROLE_FR[t] ?? t)
    .join(' / ');
  const originClue =
    `Région : ${origin.region}  ·  Espèce : ${origin.species}` +
    `  ·  Genre : ${GENDER_FR[origin.gender] ?? origin.gender}` +
    `  ·  Classe : ${originClasses || '—'}`;

  return [
    { kind: 'champ-rebus', label: 'Emoji', instruction: 'Devine le champion à partir des emojis (concept, thème, kit).', pool: 'champion', targetId: rebus.id, clueText: rebus.clue },
    { kind: 'champ-lore', label: 'Lore', instruction: "Devine le champion à partir d'un extrait de son histoire (noms masqués).", pool: 'champion', targetId: champs[0].id },
    { kind: 'champ-skin-splash', label: 'Splash de skin', instruction: 'Devine le champion : splash de skin zoomé, se révèle à chaque erreur.', pool: 'champion', targetId: champs[1].id },
    { kind: 'qcm', label: 'Stats de base', instruction: 'Stats de base — choisis la bonne réponse.', pool: null, targetId: null, qcm: [
      champMaxQ(data, `${seed}:st1`, 'Plus haute vitesse de déplacement de base ?', (c) => c.movespeed),
      champMaxQ(data, `${seed}:st2`, "Plus haute vitesse d'attaque de base ?", (c) => c.attackspeed),
      champMinQ(data, `${seed}:st3`, "Plus courte portée d'attaque de base ?", (c) => c.attackrange),
    ] },
    { kind: 'qcm', label: "Sorts d'invo", instruction: "Sorts d'invocateur — choisis la bonne réponse.", pool: null, targetId: null, qcm: [
      summonerQ(data, `${seed}:su1`, 'Quel sort a le plus long cooldown ?', (s) => s.cooldown),
      summonerQ(data, `${seed}:su2`, 'Quel sort a le plus court cooldown ?', (s) => s.cooldown, true),
      summonerQ(data, `${seed}:su3`, 'Lequel se débloque au niveau le plus élevé ?', (s) => s.summonerLevel),
    ] },
    { kind: 'champ-spell-numbers', label: 'Chiffres de sort', instruction: "Devine le champion à partir des chiffres d'un de ses sorts.", pool: 'champion', targetId: champs[2].id },
    { kind: 'item-build', label: 'Construction', instruction: "Devine l'objet à partir de ses composants.", pool: 'item', targetId: itemBuild.id, clueText: components },
    { kind: 'champ-passive', label: 'Passif', instruction: 'Devine le champion à partir de son passif (nom masqué).', pool: 'champion', targetId: champs[3].id },
    { kind: 'qcm', label: 'Ancienneté', instruction: 'Ordre de sortie — choisis la bonne réponse.', pool: null, targetId: null, qcm: [
      releaseQ(data, `${seed}:an1`),
      releaseQ(data, `${seed}:an2`),
      releaseQ(data, `${seed}:an3`),
    ] },
    { kind: 'champ-splash', label: 'Splash zoomé', instruction: 'Devine le champion : splash très zoomé, se révèle à chaque erreur.', pool: 'champion', targetId: champs[4].id },
    { kind: 'champ-origin', label: 'Origine', instruction: 'Devine le champion à partir de son origine.', pool: 'champion', targetId: origin.id, clueText: originClue },
    { kind: 'champ-spell', label: 'Icône de sort', instruction: "Devine le champion à partir de l'icône (zoomée) d'un sort.", pool: 'champion', targetId: champs[5].id, hideName: true },
    { kind: 'qcm', label: 'Objets', instruction: 'Objets — choisis la bonne réponse.', pool: null, targetId: null, qcm: [
      itemStatQ(data, `${seed}:it1`, 'FlatArmorMod', "d'armure") ?? itemGoldQ(data, `${seed}:itf1`),
      itemStatQ(data, `${seed}:it2`, 'FlatSpellBlockMod', 'de résistance magique') ?? itemGoldQ(data, `${seed}:itf2`),
      itemStatQ(data, `${seed}:it3`, 'PercentLifeStealMod', 'de vol de vie') ?? itemGoldQ(data, `${seed}:itf3`),
    ] },
  ];
}

/** Blur mode — 15 rounds, all zoomed/blurred-image guessing (skin splash,
 * splash art, spell icon), cycled evenly (5 of each) over 15 distinct champs. */
function buildBlurRounds(data: DdragonData, seed: string): DailyRound[] {
  const champs = sample(data.champions, 15, rngFrom(`${seed}:blur-champs`));
  const kinds: DailyRound['kind'][] = ['champ-skin-splash', 'champ-splash', 'champ-spell'];
  return champs.map((c, i) => {
    const kind = kinds[i % kinds.length];
    if (kind === 'champ-skin-splash') {
      return {
        kind,
        label: 'Splash de skin',
        instruction: 'Devine le champion : splash de skin zoomé, se révèle à chaque erreur.',
        pool: 'champion',
        targetId: c.id,
      };
    }
    if (kind === 'champ-splash') {
      return {
        kind,
        label: 'Splash zoomé',
        instruction: 'Devine le champion : splash très zoomé, se révèle à chaque erreur.',
        pool: 'champion',
        targetId: c.id,
      };
    }
    return {
      kind: 'champ-spell',
      label: 'Icône de sort',
      instruction: "Devine le champion à partir de l'icône (zoomée) d'un de ses sorts.",
      pool: 'champion',
      targetId: c.id,
      hideName: true,
    };
  });
}

/** Builds the deterministic daily quiz for a given day + mode. */
export function buildDailyQuiz(
  data: DdragonData,
  dateKey: string,
  mode: QuizMode = 'normal',
  sessionHour = 20,
  reroll = '',
): DailyQuiz {
  // A fresh set per hourly session (10h→20h); 20h→10h shares the 20h set.
  // Hardcore and blur each get their own seed salt (+ HC_DRAW / BLUR_DRAW) so
  // their targets differ from normal mode and from each other.
  // `reroll` is the admin's manual re-draw salt (see services/reroll.ts) — it
  // changes the draw for the current session without waiting for the next hour.
  const rerollSuffix = reroll ? `~r${reroll}` : '';
  const base = `${drawKey(dateKey)}~h${sessionHour}${rerollSuffix}`;
  const seed = mode === 'hardcore' ? `${base}#hc${HC_DRAW}` : mode === 'blur' ? `${base}#bl${BLUR_DRAW}` : base;
  const rounds =
    mode === 'hardcore' ? buildHardcoreRounds(data, seed) : mode === 'blur' ? buildBlurRounds(data, seed) : buildNormalRounds(data, seed);
  const modeSuffix =
    mode === 'hardcore' ? `-hc${HC_DRAW}` : mode === 'blur' ? `-bl${BLUR_DRAW}` : '';
  const drawId = `${DRAW || '0'}${modeSuffix}-h${sessionHour}${rerollSuffix}`;
  return { dateKey, drawId, mode, version: data.version, rounds };
}
