import type { MenuTemplateDrinkKey } from './menu-template.js';

/** Logical modifier slots that archetypes compose into café library groups. */
export type DrinkArchetypeSlot =
  | 'milk'
  | 'syrup'
  | 'shots'
  | 'beans'
  | 'milk_temperature'
  | 'milk_texture'
  | 'ice_level'
  | 'toppings';

/** How alt-milk option prices apply when the milk slot is present. */
export type DrinkArchetypeMilkCharge = 'none' | 'waived' | 'standard';

export type DrinkArchetypeId =
  | 'espresso-neat'
  | 'low-milk-hot'
  | 'milk-forward-hot'
  | 'non-coffee-milk-hot'
  | 'tea'
  | 'low-milk-iced'
  | 'milk-forward-iced'
  | 'non-coffee-milk-iced';

export interface DrinkArchetypeDef {
  id: DrinkArchetypeId;
  label: string;
  description: string;
  slots: DrinkArchetypeSlot[];
  milkCharge: DrinkArchetypeMilkCharge;
}

/** Café override for one archetype — omitted fields inherit platform defaults. */
export interface CafeDrinkArchetypeOverride {
  slots?: DrinkArchetypeSlot[];
  milkCharge?: DrinkArchetypeMilkCharge;
}

/** Café-scoped recipe map keyed by archetype id (partial overrides allowed). */
export type CafeDrinkArchetypeConfig = Partial<Record<DrinkArchetypeId, CafeDrinkArchetypeOverride>>;

/** Stable library group names for each slot. */
export const DRINK_ARCHETYPE_SLOT_GROUP_NAMES: Record<DrinkArchetypeSlot, string> = {
  milk: 'Milks',
  syrup: 'Syrups',
  shots: 'Shots',
  beans: 'Beans',
  milk_temperature: 'Milk Temperature',
  milk_texture: 'Milk Texture',
  ice_level: 'Ice Level',
  toppings: 'Toppings',
};

export const DRINK_ARCHETYPE_SLOT_LABELS: Record<DrinkArchetypeSlot, string> = {
  milk: 'Milks',
  syrup: 'Syrups',
  shots: 'Shots',
  beans: 'Beans',
  milk_temperature: 'Milk temperature',
  milk_texture: 'Milk texture',
  ice_level: 'Ice level',
  toppings: 'Toppings',
};

export const DRINK_ARCHETYPES: readonly DrinkArchetypeDef[] = [
  {
    id: 'espresso-neat',
    label: 'Espresso (neat)',
    description: 'Shot and bean options only — no milk.',
    slots: ['shots', 'beans'],
    milkCharge: 'none',
  },
  {
    id: 'low-milk-hot',
    label: 'Low-milk hot',
    description: 'Americano, macchiato, cortado — milk optional, alt-milk surcharge waived.',
    slots: ['milk', 'shots', 'beans'],
    milkCharge: 'waived',
  },
  {
    id: 'milk-forward-hot',
    label: 'Milk-forward hot',
    description: 'Latte, cappuccino, flat white, mocha.',
    slots: ['milk', 'syrup', 'shots', 'milk_temperature', 'milk_texture', 'beans'],
    milkCharge: 'standard',
  },
  {
    id: 'non-coffee-milk-hot',
    label: 'Non-coffee milk hot',
    description: 'Hot chocolate, chai, matcha — no beans or shots.',
    slots: ['milk', 'syrup', 'milk_temperature', 'toppings'],
    milkCharge: 'standard',
  },
  {
    id: 'tea',
    label: 'Tea',
    description: 'Milk only; alt-milk surcharge waived.',
    slots: ['milk'],
    milkCharge: 'waived',
  },
  {
    id: 'low-milk-iced',
    label: 'Low-milk iced',
    description: 'Iced americano — milk optional, surcharge waived.',
    slots: ['milk', 'shots', 'ice_level'],
    milkCharge: 'waived',
  },
  {
    id: 'milk-forward-iced',
    label: 'Milk-forward iced',
    description: 'Iced latte, iced mocha, iced flat white.',
    slots: ['milk', 'syrup', 'shots', 'ice_level', 'beans'],
    milkCharge: 'standard',
  },
  {
    id: 'non-coffee-milk-iced',
    label: 'Non-coffee milk iced',
    description: 'Iced chocolate, iced matcha, iced chai.',
    slots: ['milk', 'syrup', 'ice_level', 'toppings'],
    milkCharge: 'standard',
  },
] as const;

export const DRINK_ARCHETYPE_BY_ID: ReadonlyMap<DrinkArchetypeId, DrinkArchetypeDef> = new Map(
  DRINK_ARCHETYPES.map((a) => [a.id, a]),
);

export const DRINK_ARCHETYPE_IDS: readonly DrinkArchetypeId[] = DRINK_ARCHETYPES.map((a) => a.id);

/** Template drink key → default archetype for onboarding and migration name matching. */
export const MENU_TEMPLATE_DRINK_ARCHETYPE: Record<MenuTemplateDrinkKey, DrinkArchetypeId> = {
  espresso: 'espresso-neat',
  americano: 'low-milk-hot',
  macchiato: 'low-milk-hot',
  cortado: 'low-milk-hot',
  'flat-white': 'milk-forward-hot',
  latte: 'milk-forward-hot',
  cappuccino: 'milk-forward-hot',
  mocha: 'milk-forward-hot',
  'hot-chocolate': 'non-coffee-milk-hot',
  'breakfast-tea': 'tea',
  'chai-latte': 'non-coffee-milk-hot',
  'matcha-latte': 'non-coffee-milk-hot',
  'iced-latte': 'milk-forward-iced',
  'iced-americano': 'low-milk-iced',
  'iced-chocolate': 'non-coffee-milk-iced',
  'iced-mocha': 'milk-forward-iced',
  'iced-matcha-latte': 'non-coffee-milk-iced',
};

/** Display names used to infer archetype for existing café items (migration). */
export const DRINK_ARCHETYPE_NAME_ALIASES: ReadonlyArray<{
  archetype: DrinkArchetypeId;
  names: readonly string[];
}> = [
  { archetype: 'espresso-neat', names: ['espresso'] },
  { archetype: 'low-milk-hot', names: ['americano', 'macchiato', 'cortado'] },
  {
    archetype: 'milk-forward-hot',
    names: ['flat white', 'flat-white', 'latte', 'cappuccino', 'mocha'],
  },
  {
    archetype: 'non-coffee-milk-hot',
    names: ['hot chocolate', 'hot-chocolate', 'chai latte', 'chai-latte', 'matcha latte', 'matcha-latte'],
  },
  { archetype: 'tea', names: ['breakfast tea', 'breakfast-tea', 'tea'] },
  { archetype: 'low-milk-iced', names: ['iced americano', 'iced-americano'] },
  {
    archetype: 'milk-forward-iced',
    names: ['iced latte', 'iced-latte', 'iced mocha', 'iced-mocha', 'iced flat white', 'iced-flat-white'],
  },
  {
    archetype: 'non-coffee-milk-iced',
    names: [
      'iced chocolate',
      'iced-chocolate',
      'iced matcha latte',
      'iced-matcha-latte',
      'iced matcha',
      'iced chai',
      'iced chai latte',
    ],
  },
];

export function isDrinkArchetypeId(value: unknown): value is DrinkArchetypeId {
  return typeof value === 'string' && DRINK_ARCHETYPE_BY_ID.has(value as DrinkArchetypeId);
}

export function isDrinkArchetypeSlot(value: unknown): value is DrinkArchetypeSlot {
  return typeof value === 'string' && value in DRINK_ARCHETYPE_SLOT_GROUP_NAMES;
}

/** Merge café overrides onto platform defaults for one archetype. */
export function resolveCafeArchetypeRecipe(
  archetypeId: DrinkArchetypeId,
  cafeConfig: CafeDrinkArchetypeConfig | null | undefined,
): DrinkArchetypeDef {
  const base = DRINK_ARCHETYPE_BY_ID.get(archetypeId);
  if (!base) {
    throw new Error(`Unknown drink archetype: ${archetypeId}`);
  }
  const override = cafeConfig?.[archetypeId];
  if (!override) return { ...base, slots: [...base.slots] };

  const slots =
    override.slots != null
      ? override.slots.filter(isDrinkArchetypeSlot)
      : [...base.slots];
  let milkCharge = override.milkCharge ?? base.milkCharge;
  const hasMilk = slots.includes('milk');
  if (!hasMilk) milkCharge = 'none';
  else if (milkCharge === 'none') milkCharge = 'standard';

  return {
    ...base,
    slots,
    milkCharge,
  };
}

/** Full resolved recipe map for a café (every platform archetype). */
export function resolveCafeArchetypeConfig(
  cafeConfig: CafeDrinkArchetypeConfig | null | undefined,
): Record<DrinkArchetypeId, DrinkArchetypeDef> {
  const out = {} as Record<DrinkArchetypeId, DrinkArchetypeDef>;
  for (const id of DRINK_ARCHETYPE_IDS) {
    out[id] = resolveCafeArchetypeRecipe(id, cafeConfig);
  }
  return out;
}

/** Platform defaults as a serialisable café config snapshot (for migration seeding). */
export function platformDrinkArchetypeConfig(): CafeDrinkArchetypeConfig {
  const out: CafeDrinkArchetypeConfig = {};
  for (const a of DRINK_ARCHETYPES) {
    out[a.id] = { slots: [...a.slots], milkCharge: a.milkCharge };
  }
  return out;
}

/** Normalise an item name for alias matching. */
export function normaliseDrinkNameForArchetype(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Infer archetype from a menu item display name (migration / heuristics).
 * Prefers longer alias matches so "iced latte" wins over "latte".
 */
export function inferDrinkArchetypeFromName(name: string): DrinkArchetypeId | null {
  const normalised = normaliseDrinkNameForArchetype(name);
  if (!normalised) return null;

  let best: { archetype: DrinkArchetypeId; len: number } | null = null;
  for (const entry of DRINK_ARCHETYPE_NAME_ALIASES) {
    for (const alias of entry.names) {
      const aliasNorm = normaliseDrinkNameForArchetype(alias);
      if (normalised === aliasNorm || normalised.endsWith(` ${aliasNorm}`)) {
        if (!best || aliasNorm.length > best.len) {
          best = { archetype: entry.archetype, len: aliasNorm.length };
        }
      }
    }
  }
  return best?.archetype ?? null;
}

export function waiveMilkSurchargeFromCharge(milkCharge: DrinkArchetypeMilkCharge): boolean {
  return milkCharge === 'waived';
}

/**
 * Default for `allowNoMilk` when attaching an archetype (admin UI + template onboarding).
 * Tea and low-milk iced always on; among low-milk-hot, only americano (macchiato/cortado stay off).
 */
export function defaultAllowNoMilk(
  archetypeId: DrinkArchetypeId,
  hints?: { templateKey?: string; name?: string },
): boolean {
  if (archetypeId === 'tea' || archetypeId === 'low-milk-iced') return true;
  if (hints?.templateKey === 'americano') return true;
  if (hints?.name != null && normaliseDrinkNameForArchetype(hints.name) === 'americano') {
    return true;
  }
  return false;
}
