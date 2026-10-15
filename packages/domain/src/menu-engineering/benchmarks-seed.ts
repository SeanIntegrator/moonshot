import type {
  BenchmarkRow,
  CanonicalItemId,
  MenuEngineeringRegionTier,
} from '@moonshot/types';
import { getCanonicalItemMeta } from './canonical-items.js';

export const BENCHMARK_SOURCE_SUMMARY =
  'UK Specialty Café Benchmark Sample (Coho, Oeuf, & UK Independent Coffee Market Survey Q3 2026)';
export const BENCHMARK_LAST_REVIEWED = '2026-10-01';

interface BaseCityRange {
  canonicalId: CanonicalItemId;
  /** Low / Typical / High in GBP for a UK regional city (Brighton, Bristol, Manchester, Edinburgh). */
  city: readonly [low: number, typical: number, high: number];
}

/**
 * Hand-curated UK specialty café baseline (UK City tier).
 * London applies a +10% regional multiplier (rounded to nearest 5p);
 * UK Town applies a -8% regional multiplier (rounded to nearest 5p),
 * except low-ticket modifiers where explicit penny steps are preserved.
 */
const BASE_CITY_BENCHMARKS: readonly BaseCityRange[] = [
  { canonicalId: 'espresso', city: [2.7, 3.0, 3.4] },
  { canonicalId: 'double_espresso', city: [2.9, 3.2, 3.6] },
  { canonicalId: 'macchiato', city: [3.0, 3.3, 3.7] },
  { canonicalId: 'cortado', city: [3.2, 3.5, 3.9] },
  { canonicalId: 'piccolo', city: [3.2, 3.5, 3.9] },
  { canonicalId: 'flat_white', city: [3.5, 3.8, 4.2] },
  { canonicalId: 'latte', city: [3.6, 3.95, 4.4] },
  { canonicalId: 'cappuccino', city: [3.6, 3.95, 4.4] },
  { canonicalId: 'americano', city: [3.1, 3.45, 3.85] },
  { canonicalId: 'long_black', city: [3.1, 3.45, 3.85] },
  { canonicalId: 'mocha', city: [3.9, 4.3, 4.8] },
  { canonicalId: 'filter_batch_brew', city: [3.2, 3.6, 4.1] },
  { canonicalId: 'pour_over_v60', city: [4.5, 5.2, 6.5] },
  { canonicalId: 'cold_brew', city: [3.8, 4.2, 4.7] },
  { canonicalId: 'iced_latte', city: [3.9, 4.3, 4.8] },
  { canonicalId: 'iced_americano', city: [3.4, 3.8, 4.2] },
  { canonicalId: 'iced_matcha', city: [4.2, 4.65, 5.2] },
  { canonicalId: 'matcha_latte', city: [3.9, 4.4, 4.9] },
  { canonicalId: 'chai_latte', city: [3.7, 4.1, 4.6] },
  { canonicalId: 'dirty_chai', city: [4.2, 4.65, 5.1] },
  { canonicalId: 'hot_chocolate', city: [3.6, 4.0, 4.5] },
  { canonicalId: 'english_breakfast_tea', city: [2.8, 3.2, 3.6] },
  { canonicalId: 'specialty_loose_tea', city: [3.2, 3.6, 4.1] },
  { canonicalId: 'fresh_juice_smoothie', city: [4.2, 4.9, 5.8] },
  { canonicalId: 'kombucha_craft_soda', city: [3.6, 4.2, 4.8] },
  { canonicalId: 'croissant', city: [2.9, 3.4, 3.95] },
  { canonicalId: 'pain_au_chocolat', city: [3.2, 3.7, 4.25] },
  { canonicalId: 'almond_croissant', city: [3.6, 4.2, 4.8] },
  { canonicalId: 'cinnamon_cardamom_bun', city: [3.6, 4.1, 4.7] },
  { canonicalId: 'banana_bread_loaf', city: [3.5, 4.0, 4.6] },
  { canonicalId: 'brownie_cookie', city: [3.2, 3.75, 4.3] },
  { canonicalId: 'sourdough_toast_butter', city: [4.5, 5.5, 6.5] },
  { canonicalId: 'eggs_on_toast', city: [7.8, 8.9, 10.2] },
  { canonicalId: 'avocado_on_sourdough', city: [10.5, 11.9, 13.5] },
  { canonicalId: 'eggs_benedict_royale', city: [11.8, 13.5, 15.5] },
  { canonicalId: 'shakshuka_baked_eggs', city: [11.5, 13.0, 14.8] },
  { canonicalId: 'full_cooked_breakfast', city: [13.0, 14.8, 16.9] },
  { canonicalId: 'sweet_brunch_pancakes_french_toast', city: [11.2, 12.8, 14.5] },
  { canonicalId: 'granola_acai_bowl', city: [8.5, 9.8, 11.5] },
  { canonicalId: 'breakfast_brioche_bap', city: [7.5, 8.9, 10.5] },
  { canonicalId: 'lunch_toastie_sandwiches', city: [8.8, 10.2, 11.8] },
  // Research note: specialty cafés sell syrups at 60p–95p across the UK sample.
  { canonicalId: 'modifier_syrup_shot', city: [0.6, 0.75, 0.95] },
  { canonicalId: 'modifier_plant_milk', city: [0.0, 0.4, 0.6] },
  { canonicalId: 'modifier_extra_espresso_shot', city: [0.7, 0.9, 1.2] },
  { canonicalId: 'modifier_extra_poached_egg', city: [1.5, 2.0, 2.5] },
  { canonicalId: 'modifier_premium_brunch_side', city: [2.8, 3.5, 4.5] },
];

function roundToFivePence(value: number): number {
  return Math.round(value * 20) / 20;
}

function scaleRangeForRegion(
  canonicalId: CanonicalItemId,
  cityRange: readonly [number, number, number],
  regionTier: MenuEngineeringRegionTier,
): readonly [number, number, number] {
  if (regionTier === 'city') return cityRange;

  if (canonicalId === 'modifier_syrup_shot') {
    return regionTier === 'london' ? [0.65, 0.8, 0.95] : [0.6, 0.7, 0.9];
  }
  if (canonicalId === 'modifier_plant_milk') {
    return regionTier === 'london' ? [0.0, 0.5, 0.7] : [0.0, 0.4, 0.55];
  }

  const multiplier = regionTier === 'london' ? 1.1 : 0.92;
  return [
    roundToFivePence(cityRange[0] * multiplier),
    roundToFivePence(cityRange[1] * multiplier),
    roundToFivePence(cityRange[2] * multiplier),
  ];
}

export const UK_BENCHMARK_TABLE: readonly BenchmarkRow[] = (
  ['london', 'city', 'town'] as const
).flatMap((regionTier) =>
  BASE_CITY_BENCHMARKS.map((entry): BenchmarkRow => {
    const meta = getCanonicalItemMeta(entry.canonicalId);
    const [lowPricePounds, typicalPricePounds, highPricePounds] = scaleRangeForRegion(
      entry.canonicalId,
      entry.city,
      regionTier,
    );
    return {
      canonicalId: entry.canonicalId,
      label: meta.label,
      category: meta.category,
      regionTier,
      lowPricePounds,
      typicalPricePounds,
      highPricePounds,
      typicalCostPercent: meta.defaultCostPercent,
      source: BENCHMARK_SOURCE_SUMMARY,
      updatedAt: BENCHMARK_LAST_REVIEWED,
    };
  }),
);

export function getBenchmarkForCanonicalItem(
  canonicalId: CanonicalItemId,
  regionTier: MenuEngineeringRegionTier,
): BenchmarkRow | null {
  if (canonicalId === 'other') return null;
  return (
    UK_BENCHMARK_TABLE.find(
      (row) => row.canonicalId === canonicalId && row.regionTier === regionTier,
    ) ?? null
  );
}
