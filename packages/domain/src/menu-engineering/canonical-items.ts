import type { CanonicalItemId, CanonicalMenuCategory } from '@moonshot/types';

export interface CanonicalItemMeta {
  id: CanonicalItemId;
  label: string;
  category: CanonicalMenuCategory;
  defaultCostPercent: number;
  keywords: readonly string[];
}

export const CANONICAL_CATEGORY_LABELS: Record<CanonicalMenuCategory, string> = {
  espresso_based: 'Espresso & Milk Coffee',
  filter_coffee: 'Filter & Single Origin',
  tea_chai_matcha: 'Tea, Chai & Matcha',
  iced_drinks: 'Iced & Cold Drinks',
  soft_drinks: 'Juices & Craft Softs',
  pastries_bakes: 'Pastries & Counter Bakes',
  brunch_mains: 'Brunch & Kitchen Mains',
  sides_addons: 'Syrups, Milks & Add-ons',
  other: 'Other / House Specials',
};

export const CANONICAL_ITEMS: readonly CanonicalItemMeta[] = [
  { id: 'espresso', label: 'Single Espresso', category: 'espresso_based', defaultCostPercent: 12, keywords: ['espresso', 'single espresso'] },
  { id: 'double_espresso', label: 'Double Espresso (Doppio)', category: 'espresso_based', defaultCostPercent: 14, keywords: ['double espresso', 'doppio'] },
  { id: 'macchiato', label: 'Macchiato', category: 'espresso_based', defaultCostPercent: 14, keywords: ['macchiato'] },
  { id: 'cortado', label: 'Cortado', category: 'espresso_based', defaultCostPercent: 15, keywords: ['cortado'] },
  { id: 'piccolo', label: 'Piccolo', category: 'espresso_based', defaultCostPercent: 15, keywords: ['piccolo'] },
  { id: 'flat_white', label: 'Flat White', category: 'espresso_based', defaultCostPercent: 16, keywords: ['flat white'] },
  { id: 'latte', label: 'Caffè Latte', category: 'espresso_based', defaultCostPercent: 17, keywords: ['latte', 'caffe latte'] },
  { id: 'cappuccino', label: 'Cappuccino', category: 'espresso_based', defaultCostPercent: 17, keywords: ['cappuccino', 'capp'] },
  { id: 'americano', label: 'Americano', category: 'espresso_based', defaultCostPercent: 13, keywords: ['americano'] },
  { id: 'long_black', label: 'Long Black', category: 'espresso_based', defaultCostPercent: 13, keywords: ['long black'] },
  { id: 'mocha', label: 'Mocha', category: 'espresso_based', defaultCostPercent: 19, keywords: ['mocha'] },
  { id: 'filter_batch_brew', label: 'Batch Brew Filter', category: 'filter_coffee', defaultCostPercent: 14, keywords: ['batch brew', 'filter coffee', 'daily filter'] },
  { id: 'pour_over_v60', label: 'Pour Over / V60 Single Origin', category: 'filter_coffee', defaultCostPercent: 18, keywords: ['v60', 'pour over', 'chemex', 'kalita', 'aeropress'] },
  { id: 'cold_brew', label: 'Cold Brew', category: 'iced_drinks', defaultCostPercent: 15, keywords: ['cold brew'] },
  { id: 'iced_latte', label: 'Iced Latte', category: 'iced_drinks', defaultCostPercent: 18, keywords: ['iced latte', 'iced flat white'] },
  { id: 'iced_americano', label: 'Iced Americano / Iced Black', category: 'iced_drinks', defaultCostPercent: 14, keywords: ['iced americano', 'iced black'] },
  { id: 'iced_matcha', label: 'Iced Matcha Latte', category: 'iced_drinks', defaultCostPercent: 21, keywords: ['iced matcha'] },
  { id: 'matcha_latte', label: 'Matcha Latte', category: 'tea_chai_matcha', defaultCostPercent: 20, keywords: ['matcha', 'matcha latte'] },
  { id: 'chai_latte', label: 'Spiced Chai Latte', category: 'tea_chai_matcha', defaultCostPercent: 18, keywords: ['chai', 'chai latte', 'masala chai'] },
  { id: 'dirty_chai', label: 'Dirty Chai', category: 'tea_chai_matcha', defaultCostPercent: 19, keywords: ['dirty chai'] },
  { id: 'hot_chocolate', label: 'Specialty Hot Chocolate', category: 'tea_chai_matcha', defaultCostPercent: 20, keywords: ['hot chocolate', 'hot choc'] },
  { id: 'english_breakfast_tea', label: 'Breakfast / Builders Tea', category: 'tea_chai_matcha', defaultCostPercent: 12, keywords: ['breakfast tea', 'english breakfast', 'earl grey', 'yorkshire tea'] },
  { id: 'specialty_loose_tea', label: 'Loose Leaf Herbal / Green Tea', category: 'tea_chai_matcha', defaultCostPercent: 14, keywords: ['peppermint', 'chamomile', 'green tea', 'jasmin', 'oolong', 'loose leaf'] },
  { id: 'fresh_juice_smoothie', label: 'Fresh Pressed Juice / Smoothie', category: 'soft_drinks', defaultCostPercent: 28, keywords: ['orange juice', 'fresh juice', 'smoothie'] },
  { id: 'kombucha_craft_soda', label: 'Kombucha / Craft Soda', category: 'soft_drinks', defaultCostPercent: 32, keywords: ['kombucha', 'karma cola', 'craft soda', 'lemonade'] },
  { id: 'croissant', label: 'Butter Croissant', category: 'pastries_bakes', defaultCostPercent: 30, keywords: ['croissant', 'plain croissant', 'butter croissant'] },
  { id: 'pain_au_chocolat', label: 'Pain au Chocolat', category: 'pastries_bakes', defaultCostPercent: 31, keywords: ['pain au chocolat', 'chocolate croissant'] },
  { id: 'almond_croissant', label: 'Almond Croissant', category: 'pastries_bakes', defaultCostPercent: 32, keywords: ['almond croissant'] },
  { id: 'cinnamon_cardamom_bun', label: 'Cinnamon / Cardamom Bun', category: 'pastries_bakes', defaultCostPercent: 28, keywords: ['cinnamon bun', 'cardamom bun', 'morning bun', 'knot'] },
  { id: 'banana_bread_loaf', label: 'Toasted Banana Bread / Cake Slice', category: 'pastries_bakes', defaultCostPercent: 27, keywords: ['banana bread', 'lemon drizzle', 'carrot cake', 'loaf'] },
  { id: 'brownie_cookie', label: 'Brownie / Bakery Cookie', category: 'pastries_bakes', defaultCostPercent: 28, keywords: ['brownie', 'cookie', 'flapjack', 'blondie'] },
  { id: 'sourdough_toast_butter', label: 'Sourdough Toast & Cultured Butter', category: 'brunch_mains', defaultCostPercent: 20, keywords: ['toast and butter', 'sourdough toast'] },
  { id: 'eggs_on_toast', label: 'Free-Range Eggs on Sourdough', category: 'brunch_mains', defaultCostPercent: 24, keywords: ['eggs on toast', 'poached eggs', 'scrambled eggs'] },
  { id: 'avocado_on_sourdough', label: 'Smashed Avocado on Sourdough', category: 'brunch_mains', defaultCostPercent: 28, keywords: ['avocado', 'smashed avo', 'avo toast'] },
  { id: 'eggs_benedict_royale', label: 'Eggs Benedict / Florentine / Royale', category: 'brunch_mains', defaultCostPercent: 32, keywords: ['benedict', 'royale', 'florentine', 'hollandaise'] },
  { id: 'shakshuka_baked_eggs', label: 'Shakshuka / Turkish / Baked Eggs', category: 'brunch_mains', defaultCostPercent: 27, keywords: ['shakshuka', 'turkish eggs', 'cilbir', 'baked eggs', 'huevos'] },
  { id: 'full_cooked_breakfast', label: 'Full House / Veggie Cooked Breakfast', category: 'brunch_mains', defaultCostPercent: 34, keywords: ['full english', 'full house', 'cooked breakfast', 'veggie breakfast', 'fry up'] },
  { id: 'sweet_brunch_pancakes_french_toast', label: 'Pancakes / French Toast / Brioche', category: 'brunch_mains', defaultCostPercent: 26, keywords: ['pancakes', 'french toast', 'brioche', 'waffles'] },
  { id: 'granola_acai_bowl', label: 'House Granola / Bircher / Bowl', category: 'brunch_mains', defaultCostPercent: 25, keywords: ['granola', 'bircher', 'porridge', 'acai'] },
  { id: 'breakfast_brioche_bap', label: 'Breakfast Brioche Bap / Roll', category: 'brunch_mains', defaultCostPercent: 29, keywords: ['bap', 'bacon roll', 'sausage bap', 'breakfast bun', 'muffin'] },
  { id: 'lunch_toastie_sandwiches', label: 'Artisan Toastie / Focaccia Sandwich', category: 'brunch_mains', defaultCostPercent: 31, keywords: ['toastie', 'focaccia', 'sandwich', 'melt', 'bagel'] },
  { id: 'modifier_syrup_shot', label: 'House / Flavoured Syrup Add-on', category: 'sides_addons', defaultCostPercent: 10, keywords: ['syrup', 'vanilla', 'caramel', 'hazelnut'] },
  { id: 'modifier_plant_milk', label: 'Oat / Alternative Milk Swap', category: 'sides_addons', defaultCostPercent: 18, keywords: ['oat milk', 'almond milk', 'soy', 'coconut milk', 'alt milk'] },
  { id: 'modifier_extra_espresso_shot', label: 'Extra Espresso Shot', category: 'sides_addons', defaultCostPercent: 12, keywords: ['extra shot', 'add shot'] },
  { id: 'modifier_extra_poached_egg', label: 'Add Poached / Fried Egg', category: 'sides_addons', defaultCostPercent: 22, keywords: ['add egg', '+ egg', 'poached egg'] },
  { id: 'modifier_premium_brunch_side', label: 'Premium Side (Halloumi / Bacon / Smoked Salmon / Avo)', category: 'sides_addons', defaultCostPercent: 30, keywords: ['halloumi', 'streaky bacon', 'smoked salmon', 'chorizo', 'add avo'] },
  { id: 'other', label: 'Other / Custom Item', category: 'other', defaultCostPercent: 28, keywords: [] },
] as const;

const CANONICAL_BY_ID = new Map<CanonicalItemId, CanonicalItemMeta>(
  CANONICAL_ITEMS.map((item) => [item.id, item]),
);

export function getCanonicalItemMeta(id: CanonicalItemId): CanonicalItemMeta {
  return CANONICAL_BY_ID.get(id) ?? CANONICAL_BY_ID.get('other')!;
}

/**
 * Deterministic fallback mapper when an owner adds or edits an item in the
 * confirmation table without manually selecting a canonical item ID.
 */
export function inferCanonicalItemIdFromName(rawName: string): CanonicalItemId {
  const normalized = rawName.toLowerCase().trim();
  if (!normalized) return 'other';

  for (const item of CANONICAL_ITEMS) {
    if (item.id === 'other') continue;
    for (const kw of item.keywords) {
      if (normalized.includes(kw)) {
        return item.id;
      }
    }
  }
  return 'other';
}
