import type {
  ChampionDetail,
  ChampionSummary,
  DdragonData,
  Item,
  Spell,
  SummonerSpell,
} from './types';

/**
 * Patch the quiz is pinned to, so every player gets the same answers on a
 * given day. If the pinned version is no longer published, we fall back to the
 * latest (resolved from the global versions list, so the resolution is the
 * same for everyone that day).
 */
const PINNED_VERSION = '14.24.1';
const LANG = 'fr_FR';
const LANG_EN = 'en_US';
const BASE = 'https://ddragon.leagueoflegends.com';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`DDragon ${res.status} for ${url}`);
  return (await res.json()) as T;
}

let versionPromise: Promise<string> | null = null;
function resolveVersion(): Promise<string> {
  if (!versionPromise) {
    // Use the latest published patch so the data stays fresh; fall back to the
    // pinned version only if the version list can't be fetched. Resolution is
    // global, so all players still share the same data on a given day.
    versionPromise = fetchJson<string[]>(`${BASE}/api/versions.json`)
      .then((list) => list[0] ?? PINNED_VERSION)
      .catch(() => PINNED_VERSION);
  }
  return versionPromise;
}

function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}
function cacheSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / unavailable — just refetch next time */
  }
}

// ---- Raw DDragon JSON shapes (only the fields we read) ----
interface RawChampionMap {
  data: Record<
    string,
    {
      id: string;
      key: string;
      name: string;
      title: string;
      tags: string[];
      partype: string;
      info: { attack: number; defense: number; magic: number; difficulty: number };
      image: { full: string };
      stats: {
        attackrange: number;
        hp: number;
        attackdamage: number;
        attackspeed: number;
        armor: number;
        spellblock: number;
        movespeed: number;
      };
    }
  >;
}
interface RawItemMap {
  data: Record<
    string,
    {
      name: string;
      plaintext: string;
      description: string;
      gold: { total: number; purchasable: boolean };
      stats: Record<string, number>;
      tags?: string[];
      from?: string[];
      image: { full: string };
      maps: Record<string, boolean>;
    }
  >;
}
interface RawChampionDetailMap {
  data: Record<
    string,
    RawChampionMap['data'][string] & {
      blurb: string;
      skins: Array<{ num: number; name: string }>;
      spells: Array<{
        name: string;
        description: string;
        image: { full: string };
        cooldownBurn: string;
        costBurn: string;
        rangeBurn: string;
      }>;
      passive: { name: string; description: string; image: { full: string } };
    }
  >;
}
interface RawSummonerMap {
  data: Record<
    string,
    {
      id: string;
      name: string;
      cooldown: number[];
      summonerLevel: number;
      modes: string[];
      image: { full: string };
    }
  >;
}

function toSummary(raw: RawChampionMap['data'][string]): ChampionSummary {
  return {
    id: raw.id,
    key: raw.key,
    name: raw.name,
    title: raw.title,
    titleEn: raw.title, // overridden with the en_US title in loadDdragon
    tags: raw.tags ?? [],
    partype: raw.partype,
    attack: raw.info.attack,
    magic: raw.info.magic,
    difficulty: raw.info.difficulty,
    attackrange: raw.stats.attackrange,
    hp: raw.stats.hp,
    attackdamage: raw.stats.attackdamage,
    attackspeed: raw.stats.attackspeed,
    armor: raw.stats.armor,
    spellblock: raw.stats.spellblock,
    movespeed: raw.stats.movespeed,
    imageFull: raw.image.full,
  };
}

const SPELL_SLOTS: Spell['slot'][] = ['Q', 'W', 'E', 'R'];

/** Loads the base champion + item datasets for the resolved patch (cached). */
export async function loadDdragon(): Promise<DdragonData> {
  const version = await resolveVersion();
  const cacheKey = `riftexpress:ddragon:v4:${version}:${LANG}`;
  const cached = cacheGet<DdragonData>(cacheKey);
  if (cached) return cached;

  const [champRaw, itemRaw, summonerRaw] = await Promise.all([
    fetchJson<RawChampionMap>(`${BASE}/cdn/${version}/data/${LANG}/champion.json`),
    fetchJson<RawItemMap>(`${BASE}/cdn/${version}/data/${LANG}/item.json`),
    fetchJson<RawSummonerMap>(`${BASE}/cdn/${version}/data/${LANG}/summoner.json`),
  ]);

  // English names/titles (best-effort) so players can search items in English
  // and we can show bilingual titles. If this fails, FR values are kept.
  let champTitleEn: Record<string, string> = {};
  let itemNameEn: Record<string, string> = {};
  try {
    const [champEn, itemEn] = await Promise.all([
      fetchJson<RawChampionMap>(`${BASE}/cdn/${version}/data/${LANG_EN}/champion.json`),
      fetchJson<RawItemMap>(`${BASE}/cdn/${version}/data/${LANG_EN}/item.json`),
    ]);
    for (const c of Object.values(champEn.data)) champTitleEn[c.id] = c.title;
    for (const [id, raw] of Object.entries(itemEn.data)) itemNameEn[id] = raw.name;
  } catch {
    champTitleEn = {};
    itemNameEn = {};
  }

  const champions = Object.values(champRaw.data)
    .map(toSummary)
    .map((c) => ({ ...c, titleEn: champTitleEn[c.id] || c.title }))
    .sort((a, b) => a.id.localeCompare(b.id));
  const championsById: Record<string, ChampionSummary> = {};
  for (const c of champions) championsById[c.id] = c;

  const items: Item[] = Object.entries(itemRaw.data)
    .map(([id, raw]) => ({
      id,
      name: raw.name,
      nameEn: itemNameEn[id] || raw.name,
      from: raw.from ?? [],
      plaintext: raw.plaintext,
      description: raw.description,
      goldTotal: raw.gold?.total ?? 0,
      purchasable: raw.gold?.purchasable ?? false,
      stats: raw.stats ?? {},
      tags: raw.tags ?? [],
      imageFull: raw.image.full,
      onSummonersRift: Boolean(raw.maps?.['11']),
    }))
    .filter((it) => it.purchasable && it.onSummonersRift && it.goldTotal > 0 && it.name)
    .sort((a, b) => Number(a.id) - Number(b.id));
  // DDragon lists some items twice (different ids share a name across maps/
  // versions). Keep one per name so search and QCM never show duplicates.
  const seenNames = new Set<string>();
  const dedupedItems = items.filter((it) => {
    if (seenNames.has(it.name)) return false;
    seenNames.add(it.name);
    return true;
  });
  const itemsById: Record<string, Item> = {};
  for (const it of dedupedItems) itemsById[it.id] = it;

  // Summoner spells available on Summoner's Rift (modes includes "CLASSIC").
  const summoners: SummonerSpell[] = Object.values(summonerRaw.data)
    .filter((s) => s.modes?.includes('CLASSIC'))
    .map((s) => ({
      id: s.id,
      name: s.name,
      cooldown: Array.isArray(s.cooldown) ? s.cooldown[0] : Number(s.cooldown),
      summonerLevel: s.summonerLevel,
      imageFull: s.image.full,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const data: DdragonData = {
    version,
    champions,
    championsById,
    items: dedupedItems,
    itemsById,
    summoners,
  };
  cacheSet(cacheKey, data);
  return data;
}

const detailCache = new Map<string, ChampionDetail>();

/** Loads one champion's full detail (spells + passive) for the resolved patch. */
export async function loadChampionDetail(id: string): Promise<ChampionDetail> {
  const version = await resolveVersion();
  const memo = detailCache.get(id);
  if (memo) return memo;
  const cacheKey = `riftexpress:ddragon:detail:v5:${version}:${LANG}:${id}`;
  const cached = cacheGet<ChampionDetail>(cacheKey);
  if (cached) {
    detailCache.set(id, cached);
    return cached;
  }
  const raw = await fetchJson<RawChampionDetailMap>(
    `${BASE}/cdn/${version}/data/${LANG}/champion/${id}.json`,
  );
  // English spell names (best-effort) for the bilingual spell-round clue.
  let spellNameEn: string[] = [];
  try {
    const rawEn = await fetchJson<RawChampionDetailMap>(
      `${BASE}/cdn/${version}/data/${LANG_EN}/champion/${id}.json`,
    );
    spellNameEn = rawEn.data[id].spells.map((s) => s.name);
  } catch {
    spellNameEn = [];
  }
  const entry = raw.data[id];
  const detail: ChampionDetail = {
    ...toSummary(entry),
    spells: entry.spells.slice(0, 4).map((s, i) => ({
      slot: SPELL_SLOTS[i],
      name: s.name,
      nameEn: spellNameEn[i] || s.name,
      description: s.description,
      imageFull: s.image.full,
      cooldownBurn: s.cooldownBurn,
      costBurn: s.costBurn,
      rangeBurn: s.rangeBurn,
    })),
    passive: {
      name: entry.passive.name,
      description: entry.passive.description,
      imageFull: entry.passive.image.full,
    },
    blurb: entry.blurb,
    skins: (entry.skins ?? []).map((s) => ({ num: s.num, name: s.name })),
  };
  detailCache.set(id, detail);
  cacheSet(cacheKey, detail);
  return detail;
}

// ---- Image URL builders ----
export function championImg(version: string, full: string): string {
  return `${BASE}/cdn/${version}/img/champion/${full}`;
}
export function spellImg(version: string, full: string): string {
  return `${BASE}/cdn/${version}/img/spell/${full}`;
}
export function passiveImg(version: string, full: string): string {
  return `${BASE}/cdn/${version}/img/passive/${full}`;
}
export function itemImg(version: string, full: string): string {
  return `${BASE}/cdn/${version}/img/item/${full}`;
}
/** Skin splash art (no version in the path). skinNum 0 = default splash. */
export function splashImg(championId: string, skinNum: number): string {
  return `${BASE}/cdn/img/champion/splash/${championId}_${skinNum}.jpg`;
}

/** Strips HTML tags/entities from DDragon description text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
