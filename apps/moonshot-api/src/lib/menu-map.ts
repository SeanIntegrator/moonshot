import type { MenuCategory, NormalisedMenuItem, NormalisedModifierGroup } from '@moonshot/types';

type MenuItemRow = {
  id: string;
  pos_item_id: string | null;
  name: string;
  description: string | null;
  price_minor: number;
  currency: string;
  category: string;
  subcategory: string | null;
  image_url: string | null;
  emoji: string | null;
  is_available: boolean;
  tags: string[];
  modifier_groups: unknown;
};

export function mapMenuItemRow(row: MenuItemRow): NormalisedMenuItem {
  const groups = Array.isArray(row.modifier_groups)
    ? (row.modifier_groups as NormalisedModifierGroup[])
    : [];

  return {
    id: row.id,
    posItemId: row.pos_item_id,
    name: row.name,
    description: row.description,
    priceMinor: row.price_minor,
    currency: row.currency,
    category: row.category as MenuCategory,
    subcategory: row.subcategory,
    imageUrl: row.image_url,
    emoji: row.emoji,
    isAvailable: row.is_available,
    modifierGroups: groups,
    tags: row.tags ?? [],
  };
}
