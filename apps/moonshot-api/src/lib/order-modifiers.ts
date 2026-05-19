import type {
  CreateOrderLineInput,
  NormalisedMenuItem,
  NormalisedModifierGroup,
  NormalisedModifierOption,
  NormalisedOrderLineModifier,
} from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { mapMenuItemRow } from './menu-map.js';
import { ApiHttpError } from './http-errors.js';
import { parseDeclaredAllergens } from './declared-allergens.js';
import type { Pool } from 'pg';

export type ResolvedOrderLine = {
  menuItemId: string;
  itemName: string;
  unitPriceMinor: number;
  quantity: number;
  notes: string | null;
  currency: string;
  modifiers: NormalisedOrderLineModifier[];
  allergens: string[];
};

/**
 * Load menu rows (price + modifier_groups JSON) and resolve selections + totals per line.
 */
export async function resolveOrderLinesWithModifiers(params: {
  db: Pool;
  cafeId: string;
  lines: CreateOrderLineInput[];
}): Promise<{ lines: ResolvedOrderLine[]; currency: string; totalMinor: number }> {
  const { db, cafeId, lines } = params;
  const ids = [...new Set(lines.map((l) => l.menuItemId))];

  const menuRes = await db.query<Parameters<typeof mapMenuItemRow>[0]>(
    `SELECT id, pos_item_id, name, description, price_minor, currency, category, subcategory,
            image_url, emoji, is_available, tags, modifier_groups
     FROM menu_items
     WHERE cafe_id = $1 AND id = ANY($2::uuid[]) AND is_available = TRUE`,
    [cafeId, ids],
  );

  const byId = new Map(menuRes.rows.map((r) => [r.id, r]));
  if (byId.size !== ids.length) {
    throw new ApiHttpError(
      404,
      ApiErrorCode.NOT_FOUND,
      'One or more menu items were not found or are unavailable for this café',
    );
  }

  let currency: string | null = null;
  let totalMinor = 0;
  const resolved: ResolvedOrderLine[] = [];

  for (const line of lines) {
    const row = byId.get(line.menuItemId)!;
    if (currency == null) currency = row.currency;
    if (row.currency !== currency) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        'All line items must use the same currency for this order',
      );
    }

    const menuItem = mapMenuItemRow(row);
    const { unitPriceMinor, modifiers } = resolveModifiersForLine(menuItem, line);

    const allergensParsed = parseDeclaredAllergens(line.allergens);
    if (!allergensParsed.ok) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, allergensParsed.error);
    }

    const lineTotal = unitPriceMinor * line.quantity;
    totalMinor += lineTotal;

    resolved.push({
      menuItemId: line.menuItemId,
      itemName: row.name,
      unitPriceMinor,
      quantity: line.quantity,
      notes: line.notes ?? null,
      currency: row.currency,
      modifiers,
      allergens: allergensParsed.allergens,
    });
  }

  return { lines: resolved, currency: currency!, totalMinor };
}

export function resolveModifiersForLine(
  menuItem: NormalisedMenuItem,
  line: CreateOrderLineInput,
): { unitPriceMinor: number; modifiers: NormalisedOrderLineModifier[] } {
  const base = menuItem.priceMinor;
  const selections = line.modifiers ?? [];
  const groups = menuItem.modifierGroups;

  const selectedByGroup = new Map<string, Set<string>>();
  for (const s of selections) {
    const gid = s.groupId?.trim();
    const oid = s.optionId?.trim();
    if (!gid || !oid) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        'Each modifier selection requires groupId and optionId',
      );
    }
    let set = selectedByGroup.get(gid);
    if (!set) {
      set = new Set();
      selectedByGroup.set(gid, set);
    }
    set.add(oid);
  }

  const resolved: NormalisedOrderLineModifier[] = [];
  let delta = 0;

  for (const g of groups) {
    const picked = selectedByGroup.get(g.id);
    const required = g.required;
    const isSingle = g.selectionType === 'single';

    if (!picked || picked.size === 0) {
      if (!required) continue;
      const defaults = g.options.filter((o) => o.isDefault);
      if (defaults.length === 1) {
        const opt = defaults[0]!;
        delta += opt.priceMinor;
        resolved.push(modifierSnapshot(g, opt));
        continue;
      }
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        `Required modifier group "${g.name}" has no selection for "${menuItem.name}"`,
      );
    }

    if (isSingle && picked.size > 1) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        `Modifier group "${g.name}" allows only one selection for "${menuItem.name}"`,
      );
    }

    for (const optionId of picked) {
      const opt = g.options.find((o) => o.id === optionId);
      if (!opt) {
        throw new ApiHttpError(
          400,
          ApiErrorCode.VALIDATION,
          `Unknown modifier option ${optionId} in group "${g.name}" for "${menuItem.name}"`,
        );
      }
      delta += opt.priceMinor;
      resolved.push(modifierSnapshot(g, opt));
    }
  }

  /* Unknown group ids in payload */
  for (const gid of selectedByGroup.keys()) {
    if (!groups.some((g) => g.id === gid)) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        `Unknown modifier group ${gid} for "${menuItem.name}"`,
      );
    }
  }

  return { unitPriceMinor: base + delta, modifiers: resolved };
}

function modifierSnapshot(g: NormalisedModifierGroup, opt: NormalisedModifierOption): NormalisedOrderLineModifier {
  return {
    groupId: g.id,
    groupName: g.name,
    optionId: opt.id,
    optionName: opt.name,
    priceMinor: opt.priceMinor,
    posOptionId: opt.posOptionId,
  };
}
