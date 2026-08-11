import type { ChampionSummary } from '@/ddragon/types';

export type CellStatus = 'match' | 'partial' | 'miss';
export interface Cell {
  status: CellStatus;
  hint?: 'up' | 'down';
}

export const ROLE_FR: Record<string, string> = {
  Fighter: 'Combattant',
  Tank: 'Tank',
  Mage: 'Mage',
  Assassin: 'Assassin',
  Support: 'Support',
  Marksman: 'Tireur',
};

export function damageType(c: ChampionSummary): 'AD' | 'AP' | 'Hybride' {
  if (c.attack > c.magic) return 'AD';
  if (c.magic > c.attack) return 'AP';
  return 'Hybride';
}

export function rangeType(c: ChampionSummary): 'Mêlée' | 'Distance' {
  return c.attackrange >= 300 ? 'Distance' : 'Mêlée';
}

function compareRoles(guess: ChampionSummary, secret: ChampionSummary): CellStatus {
  const g = guess.tags;
  const s = secret.tags;
  const sameSet = g.length === s.length && g.every((t) => s.includes(t));
  if (sameSet) return 'match';
  return g.some((t) => s.includes(t)) ? 'partial' : 'miss';
}

function eq(a: string, b: string): CellStatus {
  return a === b ? 'match' : 'miss';
}

export interface ChampFeedback {
  champion: ChampionSummary;
  roles: Cell;
  resource: Cell;
  range: Cell;
  damage: Cell;
  difficulty: Cell;
}

export function compareChamp(guess: ChampionSummary, secret: ChampionSummary): ChampFeedback {
  return {
    champion: guess,
    roles: { status: compareRoles(guess, secret) },
    resource: { status: eq(guess.partype, secret.partype) },
    range: { status: eq(rangeType(guess), rangeType(secret)) },
    damage: { status: eq(damageType(guess), damageType(secret)) },
    difficulty:
      guess.difficulty === secret.difficulty
        ? { status: 'match' }
        : { status: 'miss', hint: secret.difficulty > guess.difficulty ? 'up' : 'down' },
  };
}
