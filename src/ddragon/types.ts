export interface ChampionSummary {
  id: string; // DDragon id, e.g. "MonkeyKing"
  key: string; // numeric key as string
  name: string; // localized display name
  title: string; // localized title (fr_FR)
  titleEn: string; // English title (en_US)
  // ---- Base stats (level 1), for the hardcore stat-trivia rounds ----
  hp: number;
  attackdamage: number;
  attackspeed: number;
  armor: number;
  spellblock: number;
  movespeed: number;
  tags: string[]; // role keys: Fighter, Tank, Mage, Assassin, Support, Marksman
  partype: string; // resource (localized)
  attack: number;
  magic: number;
  difficulty: number;
  attackrange: number;
  imageFull: string; // e.g. "Aatrox.png"
}

export interface Spell {
  slot: 'Q' | 'W' | 'E' | 'R';
  name: string; // fr_FR
  nameEn: string; // en_US
  description: string; // may contain HTML
  imageFull: string;
  cooldownBurn: string; // e.g. "9/8/7/6/5"
  costBurn: string; // e.g. "60/65/70/75/80"
  rangeBurn: string; // e.g. "550"
}

export interface ChampionSkin {
  num: number; // 0 = default
  name: string; // localized skin name
}

export interface ChampionDetail extends ChampionSummary {
  spells: Spell[];
  passive: { name: string; description: string; imageFull: string };
  blurb: string; // short lore blurb
  skins: ChampionSkin[];
}

export interface SummonerSpell {
  id: string; // e.g. "SummonerFlash"
  name: string; // localized
  cooldown: number; // base cooldown (s)
  summonerLevel: number; // unlock level
  imageFull: string;
}

export interface Item {
  id: string; // numeric id as string, e.g. "3031"
  name: string; // fr_FR
  nameEn: string; // en_US — lets players search items by their English name
  from: string[]; // component item ids (build path)
  plaintext: string;
  description: string; // contains HTML
  goldTotal: number;
  purchasable: boolean;
  stats: Record<string, number>;
  tags: string[];
  imageFull: string;
  onSummonersRift: boolean;
}

export interface DdragonData {
  version: string;
  champions: ChampionSummary[]; // sorted by id
  championsById: Record<string, ChampionSummary>;
  items: Item[]; // purchasable Summoner's Rift items, sorted by id
  itemsById: Record<string, Item>;
  summoners: SummonerSpell[]; // summoner spells (Flash, Ignite…)
}
