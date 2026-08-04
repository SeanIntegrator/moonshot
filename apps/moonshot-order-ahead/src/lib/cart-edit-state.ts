import type { OrderLineModifierSelectionInput } from '@moonshot/types';

/** Location state when opening item detail from the checkout pencil. */
export type CartEditLineState = {
  key: string;
  sizeId: string | null;
  quantity: number;
  modifiers: OrderLineModifierSelectionInput[];
};

export type ItemDetailLocationState = {
  editLine?: CartEditLineState;
};

export function parseItemDetailLocationState(state: unknown): ItemDetailLocationState | null {
  if (!state || typeof state !== 'object') return null;
  const obj = state as Record<string, unknown>;
  const edit = obj.editLine;
  if (!edit || typeof edit !== 'object') return null;
  const row = edit as Record<string, unknown>;
  if (typeof row.key !== 'string' || !row.key) return null;
  if (row.sizeId !== null && typeof row.sizeId !== 'string') return null;
  if (typeof row.quantity !== 'number' || !Number.isInteger(row.quantity) || row.quantity < 1) {
    return null;
  }
  if (!Array.isArray(row.modifiers)) return null;
  const modifiers: OrderLineModifierSelectionInput[] = [];
  for (const m of row.modifiers) {
    if (!m || typeof m !== 'object') return null;
    const mod = m as Record<string, unknown>;
    if (typeof mod.groupId !== 'string' || typeof mod.optionId !== 'string') return null;
    modifiers.push({ groupId: mod.groupId, optionId: mod.optionId });
  }
  return {
    editLine: {
      key: row.key,
      sizeId: row.sizeId as string | null,
      quantity: row.quantity,
      modifiers,
    },
  };
}
