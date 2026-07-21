/**
 * KDS view models — prep/display hints derived client-side from
 * `NormalisedOrder` + `KdsConfig` (board UI plan consumes these).
 */

import type { KdsConfig } from './cafe.js';
import type { NormalisedOrderItem, NormalisedOrderLineModifier } from './order.js';

export type KdsChipShape = 'square' | 'round';

export interface KdsChip {
  label: string;
  shape: KdsChipShape;
  colorHex?: string | null;
}

/**
 * Flow-style prep hints (milk colour, bean badge, modifier chips).
 * Derived via {@link deriveLinePrep} — not attached to socket payloads.
 */
export interface KdsPrep {
  /** Hex colour for the drink line (from milk option or milkColors map). */
  milkColorHex?: string | null;
  /** Key into `KdsConfig.beanBadges` when a bean-style option is present. */
  beanBadgeKey?: 'house' | 'decaf' | 'guest' | null;
  chips: KdsChip[];
}

/** Default group-name classification when café config is empty. */
export const DEFAULT_MODIFIER_CLASSIFICATION = {
  coffeeModifiers: ['Milks', 'Milk'],
  additions: ['Syrups', 'Extras'],
} as const;

const BEAN_NAME_KEYS: Array<{ key: 'decaf' | 'guest' | 'house'; match: RegExp }> = [
  { key: 'decaf', match: /\bdecaf\b/i },
  { key: 'guest', match: /\bguest\b/i },
  { key: 'house', match: /\bhouse\b/i },
];

function chipLabelFor(mod: NormalisedOrderLineModifier): string {
  const raw = (mod.chipLabel ?? '').trim();
  if (raw) return raw;
  const name = mod.optionName.trim();
  if (name.length <= 2) return name.toUpperCase();
  return name.slice(0, 2);
}

function isCoffeeModifier(groupName: string, classification: { coffeeModifiers: string[] }): boolean {
  const g = groupName.trim().toLowerCase();
  return classification.coffeeModifiers.some((n) => n.trim().toLowerCase() === g);
}

function milkColorFromMod(
  mod: NormalisedOrderLineModifier,
  milkColors: Record<string, { bg: string }>,
): string | null {
  if (typeof mod.colorHex === 'string' && mod.colorHex.trim()) return mod.colorHex.trim();
  const label = (mod.chipLabel ?? mod.optionName).trim().toLowerCase();
  if (!label) return null;
  for (const [key, cfg] of Object.entries(milkColors)) {
    if (key.toLowerCase() === label || key.toLowerCase() === mod.optionName.trim().toLowerCase()) {
      return cfg.bg;
    }
  }
  return null;
}

function beanKeyFromMod(mod: NormalisedOrderLineModifier): 'house' | 'decaf' | 'guest' | null {
  const hay = `${mod.optionName} ${mod.chipLabel ?? ''}`.trim();
  for (const entry of BEAN_NAME_KEYS) {
    if (entry.match.test(hay)) return entry.key;
  }
  return null;
}

/**
 * Derive Flow-style prep hints for one order line from modifiers + café KDS config.
 */
export function deriveLinePrep(item: NormalisedOrderItem, config: KdsConfig): KdsPrep {
  const coffeeNames =
    config.modifierClassification?.coffeeModifiers?.length > 0
      ? config.modifierClassification.coffeeModifiers
      : [...DEFAULT_MODIFIER_CLASSIFICATION.coffeeModifiers];
  const classification = { coffeeModifiers: coffeeNames };
  const chips: KdsChip[] = [];
  let milkColorHex: string | null = null;
  let beanBadgeKey: 'house' | 'decaf' | 'guest' | null = null;

  for (const mod of item.modifiers) {
    if (mod.isSize) continue;

    const bean = beanKeyFromMod(mod);
    if (bean && !beanBadgeKey) beanBadgeKey = bean;

    const coffee = isCoffeeModifier(mod.groupName, classification);

    if (coffee) {
      const colour = milkColorFromMod(mod, config.milkColors ?? {});
      if (colour && !milkColorHex) milkColorHex = colour;
      chips.push({
        label: chipLabelFor(mod),
        shape: 'square',
        colorHex: mod.colorHex ?? colour,
      });
      continue;
    }

    // Additions (and unclassified groups) → round chips so syrups stay visible.
    chips.push({
      label: chipLabelFor(mod),
      shape: 'round',
      colorHex: mod.colorHex ?? null,
    });
  }

  return {
    milkColorHex,
    beanBadgeKey,
    chips,
  };
}
