import type {
  CreateOrderLineInput,
  MenuCategory,
  NormalisedItemSize,
  NormalisedMenuItem,
  NormalisedModifierGroup,
  NormalisedModifierOption,
  NormalisedOrderLineModifier,
} from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { fetchMenuItemsByIds } from './menu/menu-fetch.js';
import { SIZE_MODIFIER_GROUP_ID } from './menu/menu-map.js';
import { ApiHttpError } from './http-errors.js';
import { parseDeclaredAllergens } from './declared-allergens.js';
import type { Pool } from 'pg';

export type ResolvedOrderLine = {
  menuItemId: string;
  itemName: string;
  category: MenuCategory;
  unitPriceMinor: number;
  quantity: number;
  notes: string | null;
  currency: string;
  modifiers: NormalisedOrderLineModifier[];
  allergens: string[];
};

/**
 * Load menu rows (price + sizes + modifier groups) and resolve selections + totals per line.
 */
export async function resolveOrderLinesWithModifiers(params: {
  db: Pool;
  cafeId: string;
  lines: CreateOrderLineInput[];
}): Promise<{ lines: ResolvedOrderLine[]; currency: string; totalMinor: number }> {
  const { db, cafeId, lines } = params;
  const ids = [...new Set(lines.map((l) => l.menuItemId))];

  const byId = await fetchMenuItemsByIds(db, cafeId, ids);
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
    const menuItem = byId.get(line.menuItemId)!;

    if (currency == null) currency = menuItem.currency;
    if (menuItem.currency !== currency) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        'All line items must use the same currency for this order',
      );
    }

    const { unitPriceMinor, modifiers } = resolveModifiersForLine(menuItem, line);

    const allergensParsed = parseDeclaredAllergens(line.allergens);
    if (!allergensParsed.ok) {
      throw new ApiHttpError(400, ApiErrorCode.VALIDATION, allergensParsed.error);
    }

    const lineTotal = unitPriceMinor * line.quantity;
    totalMinor += lineTotal;

    resolved.push({
      menuItemId: line.menuItemId,
      itemName: menuItem.name,
      category: menuItem.category,
      unitPriceMinor,
      quantity: line.quantity,
      notes: line.notes ?? null,
      currency: menuItem.currency,
      modifiers,
      allergens: allergensParsed.allergens,
    });
  }

  return { lines: resolved, currency: currency!, totalMinor };
}

function resolveBasePriceAndSize(
  menuItem: NormalisedMenuItem,
  line: CreateOrderLineInput,
): { base: number; sizeModifier: NormalisedOrderLineModifier | null } {
  const sizes = menuItem.sizes ?? [];
  if (sizes.length === 0) {
    return { base: menuItem.priceMinor, sizeModifier: null };
  }

  const sizeId = line.sizeId?.trim();
  let size: NormalisedItemSize | undefined;

  if (sizeId) {
    size = sizes.find((s) => s.id === sizeId);
    if (!size) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        `Unknown size ${sizeId} for "${menuItem.name}"`,
      );
    }
  } else {
    const defaults = sizes.filter((s) => s.isDefault);
    size = defaults[0] ?? sizes[0];
    if (!size) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        `Size is required for "${menuItem.name}"`,
      );
    }
  }

  return {
    base: size.priceMinor,
    sizeModifier: {
      groupId: SIZE_MODIFIER_GROUP_ID,
      groupName: 'Size',
      optionId: size.id,
      optionName: size.name,
      priceMinor: size.priceMinor,
      isSize: true,
      isDefault: size.isDefault === true,
      colorHex: size.colorHex ?? null,
      chipLabel: size.chipLabel ?? null,
    },
  };
}

export function resolveModifiersForLine(
  menuItem: NormalisedMenuItem,
  line: CreateOrderLineInput,
): { unitPriceMinor: number; modifiers: NormalisedOrderLineModifier[] } {
  const { base, sizeModifier } = resolveBasePriceAndSize(menuItem, line);
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

  const resolved: NormalisedOrderLineModifier[] = sizeModifier ? [sizeModifier] : [];
  let delta = 0;

  for (const g of groups) {
    const picked = selectedByGroup.get(g.id);
    const required = g.required;
    const isSingle = g.selectionType === 'single';

    if (!picked || picked.size === 0) {
      if (!required) continue;
      const defaults = g.options.filter((o) => o.isDefault && o.isAvailable !== false);
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

    if (!isSingle && g.maxSelect != null && picked.size > g.maxSelect) {
      throw new ApiHttpError(
        400,
        ApiErrorCode.VALIDATION,
        `Modifier group "${g.name}" allows at most ${g.maxSelect} selections`,
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
      if (opt.isAvailable === false) {
        throw new ApiHttpError(
          400,
          ApiErrorCode.VALIDATION,
          `"${opt.name}" is currently unavailable for "${menuItem.name}"`,
        );
      }
      delta += opt.priceMinor;
      resolved.push(modifierSnapshot(g, opt));
    }
  }

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

function modifierSnapshot(
  g: NormalisedModifierGroup,
  opt: NormalisedModifierOption,
): NormalisedOrderLineModifier {
  return {
    groupId: g.id,
    groupName: g.name,
    optionId: opt.id,
    optionName: opt.name,
    priceMinor: opt.priceMinor,
    posOptionId: opt.posOptionId,
    colorHex: opt.colorHex ?? null,
    chipLabel: opt.chipLabel ?? null,
    isSize: false,
    isDefault: opt.isDefault === true,
  };
}
