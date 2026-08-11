import { stripHtml } from './ddragon';

/**
 * Extracts an item's passive/active effect text — i.e. the description with the
 * raw `<stats>` block stripped out, so only the gameplay effect remains. This
 * surfaces things absent from the structured `stats` map (lethality, cooldown
 * reduction, on-hit effects, shields…), which the old stats round couldn't show.
 */
export function itemEffectText(description: string): string {
  const withoutStats = (description ?? '').replace(/<stats>[\s\S]*?<\/stats>/gi, ' ');
  return stripHtml(withoutStats);
}

/** True when an item has a meaningful passive/active effect (not a pure stat stick). */
export function hasItemEffect(item: { description: string }): boolean {
  return itemEffectText(item.description).length >= 40;
}

/** Human-readable labels (FR) for the structured item stat keys we surface. */
export const STAT_LABELS: Record<string, string> = {
  FlatHPPoolMod: 'Vie',
  FlatMPPoolMod: 'Mana',
  FlatPhysicalDamageMod: "Dégâts d'attaque",
  FlatMagicDamageMod: 'Puissance',
  FlatArmorMod: 'Armure',
  FlatSpellBlockMod: 'Résist. magique',
  PercentAttackSpeedMod: "Vitesse d'attaque",
  FlatCritChanceMod: 'Taux de critique',
  PercentLifeStealMod: 'Vol de vie',
  FlatHPRegenMod: 'Régén. PV',
  FlatMovementSpeedMod: 'Vitesse de déplacement',
  PercentMovementSpeedMod: 'Vitesse (%)',
};

const PERCENT_KEYS = new Set([
  'PercentAttackSpeedMod',
  'FlatCritChanceMod',
  'PercentLifeStealMod',
  'PercentMovementSpeedMod',
]);

export interface StatLine {
  key: string;
  label: string;
  display: string;
}

/** Returns the displayable, non-zero structured stats of an item. */
export function itemStatLines(stats: Record<string, number>): StatLine[] {
  return Object.entries(stats)
    .filter(([key, value]) => STAT_LABELS[key] && value)
    .map(([key, value]) => ({
      key,
      label: STAT_LABELS[key],
      display: PERCENT_KEYS.has(key) ? `${Math.round(value * 100)}%` : String(value),
    }));
}

export function statCount(stats: Record<string, number>): number {
  return itemStatLines(stats).length;
}
