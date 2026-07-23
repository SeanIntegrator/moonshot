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

/** Default group-name classification when café config is empty / partial. */
export const DEFAULT_MODIFIER_CLASSIFICATION = {
  coffeeModifiers: ['Milks', 'Milk'],
  additions: ['Syrups', 'Extras', 'Toppings'],
  shots: ['Shots'],
  beans: ['Beans'],
  milkTemperature: ['Milk Temperature'],
  milkTexture: ['Milk Texture'],
  iceLevel: ['Ice Level'],
} as const;

/** Default bean bracket accents for Flow shot labels. */
export const DEFAULT_BEAN_ACCENTS = {
  house: '#e8a33d',
  decaf: '#7aa2d6',
  guest: '#7fb069',
} as const;

export type KdsBeanKey = 'house' | 'decaf' | 'guest';

export interface FlowMilkChip {
  /** Display name (e.g. Oat). */
  name: string;
  bg: string;
  text: string;
  /** Shown italic before the milk name when non-default. */
  temperature?: string | null;
  /** Shown italic after the milk name when non-default. */
  texture?: string | null;
}

export interface FlowSyrupChip {
  label: string;
  colorHex?: string | null;
}

/**
 * Structured Flow row view-model for one order line.
 * Derived via {@link deriveFlowLine} — not attached to socket payloads.
 */
export interface FlowLineView {
  isFood: boolean;
  /**
   * Non-default shot/bean label inside brackets, e.g. `Triple`, `Single · Decaf`.
   * Null when both shot count and bean are default (double + house).
   */
  shotLabel: string | null;
  /** Bean key driving bracket colour; defaults to house when no bean selected. */
  beanKey: KdsBeanKey;
  /** Accent hex for the shot brackets. */
  beanAccent: string;
  /** Non-default size label (uppercase in UI); null when default/absent. */
  sizeLabel: string | null;
  /**
   * Milk chip. Null when milk is default (or absent) AND no non-default
   * temperature/texture is attached.
   */
  milk: FlowMilkChip | null;
  syrups: FlowSyrupChip[];
  notes: string | null;
  allergens: string[];
}

const BEAN_NAME_KEYS: Array<{ key: KdsBeanKey; match: RegExp }> = [
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

function groupNamesMatch(groupName: string, names: string[]): boolean {
  const g = groupName.trim().toLowerCase();
  return names.some((n) => n.trim().toLowerCase() === g);
}

function resolveClassification(config: KdsConfig) {
  const mc = config.modifierClassification;
  return {
    coffeeModifiers:
      mc?.coffeeModifiers?.length > 0
        ? mc.coffeeModifiers
        : [...DEFAULT_MODIFIER_CLASSIFICATION.coffeeModifiers],
    additions:
      mc?.additions?.length > 0
        ? mc.additions
        : [...DEFAULT_MODIFIER_CLASSIFICATION.additions],
    shots:
      mc?.shots?.length > 0 ? mc.shots : [...DEFAULT_MODIFIER_CLASSIFICATION.shots],
    beans:
      mc?.beans?.length > 0 ? mc.beans : [...DEFAULT_MODIFIER_CLASSIFICATION.beans],
    milkTemperature:
      mc?.milkTemperature?.length > 0
        ? mc.milkTemperature
        : [...DEFAULT_MODIFIER_CLASSIFICATION.milkTemperature],
    milkTexture:
      mc?.milkTexture?.length > 0
        ? mc.milkTexture
        : [...DEFAULT_MODIFIER_CLASSIFICATION.milkTexture],
    iceLevel:
      mc?.iceLevel && mc.iceLevel.length > 0
        ? mc.iceLevel
        : [...DEFAULT_MODIFIER_CLASSIFICATION.iceLevel],
  };
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

function milkTextFromMod(
  mod: NormalisedOrderLineModifier,
  milkColors: Record<string, { text?: string }>,
  bg: string | null,
): string {
  const label = (mod.chipLabel ?? mod.optionName).trim().toLowerCase();
  for (const [key, cfg] of Object.entries(milkColors)) {
    if (
      (key.toLowerCase() === label || key.toLowerCase() === mod.optionName.trim().toLowerCase()) &&
      typeof cfg.text === 'string' &&
      cfg.text.trim()
    ) {
      return cfg.text.trim();
    }
  }
  // Dark bg → light text heuristic when no explicit text colour.
  if (bg && isDarkHex(bg)) return '#ffffff';
  return '#1a1a1a';
}

function isDarkHex(hex: string): boolean {
  const h = hex.replace('#', '');
  if (h.length !== 6 && h.length !== 3) return false;
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return false;
  // Relative luminance shortcut
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

function beanKeyFromMod(mod: NormalisedOrderLineModifier): KdsBeanKey | null {
  const hay = `${mod.optionName} ${mod.chipLabel ?? ''}`.trim();
  for (const entry of BEAN_NAME_KEYS) {
    if (entry.match.test(hay)) return entry.key;
  }
  return null;
}

function beanAccentFor(key: KdsBeanKey, config: KdsConfig): string {
  const badge = config.beanBadges?.[key];
  if (badge?.accent?.trim()) return badge.accent.trim();
  return DEFAULT_BEAN_ACCENTS[key];
}

/**
 * Derive Flow-style prep hints for one order line from modifiers + café KDS config.
 */
export function deriveLinePrep(item: NormalisedOrderItem, config: KdsConfig): KdsPrep {
  const classification = resolveClassification(config);
  const chips: KdsChip[] = [];
  let milkColorHex: string | null = null;
  let beanBadgeKey: KdsBeanKey | null = null;

  for (const mod of item.modifiers) {
    if (mod.isSize) continue;

    // Role groups (shots/beans/temp/texture/ice) are not chips in the legacy prep model.
    if (
      groupNamesMatch(mod.groupName, classification.shots) ||
      groupNamesMatch(mod.groupName, classification.beans) ||
      groupNamesMatch(mod.groupName, classification.milkTemperature) ||
      groupNamesMatch(mod.groupName, classification.milkTexture) ||
      groupNamesMatch(mod.groupName, classification.iceLevel)
    ) {
      const bean = beanKeyFromMod(mod);
      if (bean && !beanBadgeKey) beanBadgeKey = bean;
      continue;
    }

    const bean = beanKeyFromMod(mod);
    if (bean && !beanBadgeKey) beanBadgeKey = bean;

    const coffee = groupNamesMatch(mod.groupName, classification.coffeeModifiers);

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

function isFoodCategory(category: string | null | undefined): boolean {
  return typeof category === 'string' && (category === 'food' || category.toLowerCase().includes('food'));
}

/**
 * Derive the Flow board row view-model for one order line.
 * Hides default / redundant modifiers (double shot, house bean, whole milk, etc.).
 */
export function deriveFlowLine(item: NormalisedOrderItem, config: KdsConfig): FlowLineView {
  const classification = resolveClassification(config);
  const isFood = isFoodCategory(item.category);

  let sizeLabel: string | null = null;
  let shotMod: NormalisedOrderLineModifier | null = null;
  let beanMod: NormalisedOrderLineModifier | null = null;
  let milkMod: NormalisedOrderLineModifier | null = null;
  let tempMod: NormalisedOrderLineModifier | null = null;
  let textureMod: NormalisedOrderLineModifier | null = null;
  const syrups: FlowSyrupChip[] = [];

  for (const mod of item.modifiers) {
    if (mod.isSize) {
      if (!mod.isDefault) {
        sizeLabel = mod.optionName.trim() || null;
      }
      continue;
    }

    if (groupNamesMatch(mod.groupName, classification.shots)) {
      if (!mod.isDefault) shotMod = mod;
      continue;
    }

    if (groupNamesMatch(mod.groupName, classification.beans)) {
      if (!mod.isDefault) beanMod = mod;
      continue;
    }

    if (groupNamesMatch(mod.groupName, classification.milkTemperature)) {
      if (!mod.isDefault) tempMod = mod;
      continue;
    }

    if (groupNamesMatch(mod.groupName, classification.milkTexture)) {
      if (!mod.isDefault) textureMod = mod;
      continue;
    }

    // Ice level is a prep slider — not a Flow syrup/extra chip.
    if (groupNamesMatch(mod.groupName, classification.iceLevel)) {
      continue;
    }

    if (groupNamesMatch(mod.groupName, classification.coffeeModifiers)) {
      milkMod = mod;
      continue;
    }

    // Additions + unclassified → syrup/extra chips (always shown; no default syrup).
    syrups.push({
      label: mod.optionName.trim() || chipLabelFor(mod),
      colorHex: mod.colorHex ?? null,
    });
  }

  const beanKey: KdsBeanKey = beanMod
    ? (beanKeyFromMod(beanMod) ?? 'house')
    : 'house';
  const beanAccent = beanAccentFor(beanKey, config);

  const shotParts: string[] = [];
  if (shotMod) shotParts.push(shotMod.optionName.trim());
  if (beanMod) {
    const beanLabel = beanMod.optionName.trim();
    // Prefer short bean name for density (Decaf / Guest), already optionName.
    shotParts.push(beanLabel);
  }
  const shotLabel = shotParts.length > 0 ? shotParts.join(' · ') : null;

  let milk: FlowMilkChip | null = null;
  const temperature = tempMod?.optionName.trim() || null;
  const texture = textureMod?.optionName.trim() || null;
  const milkIsDefault = !milkMod || milkMod.isDefault === true;

  if (!milkIsDefault || temperature || texture) {
    if (milkMod && !milkIsDefault) {
      const bg =
        milkColorFromMod(milkMod, config.milkColors ?? {}) ??
        milkMod.colorHex?.trim() ??
        '#e8dcc8';
      milk = {
        name: milkMod.optionName.trim(),
        bg,
        text: milkTextFromMod(milkMod, config.milkColors ?? {}, bg),
        temperature,
        texture,
      };
    } else {
      // Default/absent milk but non-default temp/texture — still show a milk chip shell.
      const bg = '#e8e8e8';
      milk = {
        name: milkMod?.optionName.trim() || 'Milk',
        bg,
        text: '#1a1a1a',
        temperature,
        texture,
      };
    }
  }

  return {
    isFood,
    shotLabel,
    beanKey,
    beanAccent,
    sizeLabel,
    milk,
    syrups,
    notes: item.notes,
    allergens: item.allergens ?? [],
  };
}
