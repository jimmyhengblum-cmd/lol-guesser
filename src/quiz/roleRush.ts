import type { ChampionSummary, DdragonData } from '@/ddragon/types';
import { CHAMPION_META, type Position } from './championMeta';

export const ROLE_RUSH_ROLES: Position[] = ['Top', 'Jungle', 'Mid', 'Bottom', 'Support'];

/** Display label per role — "Bottom" reads as ADC to players. */
export const ROLE_RUSH_LABELS: Record<Position, string> = {
  Top: 'Top',
  Jungle: 'Jungle',
  Mid: 'Mid',
  Bottom: 'ADC',
  Support: 'Support',
};

/** Selectable timer lengths (minutes) — picked before starting a run. */
export const ROLE_RUSH_DURATIONS_MIN = [3, 5, 10, 15, 20];
export const ROLE_RUSH_DEFAULT_DURATION_MIN = 10;

/** All champions tagged for `role`, restricted to what the loaded patch has. */
export function championsForRole(data: DdragonData, role: Position): ChampionSummary[] {
  return CHAMPION_META.filter((m) => m.positions.includes(role) && data.championsById[m.id]).map(
    (m) => data.championsById[m.id],
  );
}

/**
 * Strips accents/case/punctuation so "Kai'Sa", "kaisa", "KAI SA" all match the
 * same target. ponytail: exact full-name match only — co-champ names like
 * "Nunu et Willump" need the whole name typed, no partial/fuzzy matching.
 */
export function normalizeGuess(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}
