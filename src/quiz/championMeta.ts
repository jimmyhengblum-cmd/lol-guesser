import metaJson from '@/data/champions-meta.json';

export type Position = 'Top' | 'Jungle' | 'Mid' | 'Bottom' | 'Support';
export type Gender = 'Male' | 'Female' | 'Other';
export type RangeType = 'Melee' | 'Ranged';

/**
 * Curated champion metadata for the attribute round.
 *
 * ▶ EDIT THE DATA in `src/data/champions-meta.json` — that JSON is the single
 *   source of truth. `resource` and `range` are NOT in it: they are derived
 *   from Data Dragon at runtime (always accurate). Only the lore attributes
 *   (gender, positions, species, region, releaseYear) are hand-maintained.
 *
 * `id` must match the Data Dragon id (used for the icon). Allowed values:
 *   gender   : "Male" | "Female" | "Other"
 *   positions: array of "Top" | "Jungle" | "Mid" | "Bottom" | "Support"
 */
export interface ChampMeta {
  id: string;
  name: string;
  gender: Gender;
  positions: Position[];
  species: string;
  region: string;
  releaseYear: number;
}

export const CHAMPION_META: ChampMeta[] = metaJson as unknown as ChampMeta[];

export const META_BY_ID: Record<string, ChampMeta> = Object.fromEntries(
  CHAMPION_META.map((c) => [c.id, c]),
);

// ---- Display labels (FR) ----
export const GENDER_FR: Record<Gender, string> = { Male: 'Homme', Female: 'Femme', Other: 'Autre' };
export const RANGE_FR: Record<RangeType, string> = { Melee: 'Mêlée', Ranged: 'Distance' };
export const POS_FR: Record<Position, string> = {
  Top: 'Top', Jungle: 'Jungle', Mid: 'Mid', Bottom: 'Bot', Support: 'Supp',
};

// ---- A champion row = curated meta + resource/range derived from DDragon ----
export interface ChampRow extends ChampMeta {
  resource: string;
  range: RangeType;
}

export type CellStatus = 'match' | 'partial' | 'miss';
export interface Cell {
  status: CellStatus;
  hint?: 'up' | 'down';
}
export interface RowFeedback {
  row: ChampRow;
  gender: Cell;
  positions: Cell;
  species: Cell;
  resource: Cell;
  range: Cell;
  region: Cell;
  year: Cell;
}

const eq = (a: string, b: string): CellStatus => (a === b ? 'match' : 'miss');

function comparePositions(g: Position[], s: Position[]): CellStatus {
  const same = g.length === s.length && g.every((p) => s.includes(p));
  if (same) return 'match';
  return g.some((p) => s.includes(p)) ? 'partial' : 'miss';
}

export function compareRow(guess: ChampRow, secret: ChampRow): RowFeedback {
  return {
    row: guess,
    gender: { status: eq(guess.gender, secret.gender) },
    positions: { status: comparePositions(guess.positions, secret.positions) },
    species: { status: eq(guess.species, secret.species) },
    resource: { status: eq(guess.resource, secret.resource) },
    range: { status: eq(guess.range, secret.range) },
    region: { status: eq(guess.region, secret.region) },
    year:
      guess.releaseYear === secret.releaseYear
        ? { status: 'match' }
        : { status: 'miss', hint: secret.releaseYear > guess.releaseYear ? 'up' : 'down' },
  };
}
