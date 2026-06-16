import type { OrderLineModifierSelectionInput } from '@moonshot/types';
import type { PickupDelayMinutes } from '../components/PickupTimeChip.js';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type CartLine = {
  /** Stable merge key */
  key: string;
  menuItemId: string;
  quantity: number;
  modifiers: OrderLineModifierSelectionInput[];
  allergens: string[];
};

function modifierKey(modifiers: OrderLineModifierSelectionInput[]): string {
  if (modifiers.length === 0) return '';
  return [...modifiers]
    .map((m) => `${m.groupId}:${m.optionId}`)
    .sort()
    .join('|');
}

export function cartLineKey(menuItemId: string, modifiers: OrderLineModifierSelectionInput[]): string {
  const mk = modifierKey(modifiers);
  return mk ? `${menuItemId}#${mk}` : menuItemId;
}

type CartContextValue = {
  lines: CartLine[];
  pickupDelayMinutes: PickupDelayMinutes;
  setPickupDelayMinutes: (minutes: PickupDelayMinutes) => void;
  /** Menu grid: increments a line with no modifiers / allergens */
  bumpSimpleQuantity: (menuItemId: string, delta: number) => void;
  /** Item detail / checkout */
  upsertLine: (params: {
    menuItemId: string;
    quantity: number;
    modifiers: OrderLineModifierSelectionInput[];
    allergens: string[];
  }) => void;
  removeLine: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [pickupDelayMinutes, setPickupDelayMinutes] = useState<PickupDelayMinutes>(0);

  const bumpSimpleQuantity = useCallback((menuItemId: string, delta: number) => {
    const key = cartLineKey(menuItemId, []);
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.key === key);
      if (idx === -1) {
        if (delta <= 0) return prev;
        return [...prev, { key, menuItemId, quantity: delta, modifiers: [], allergens: [] }];
      }
      const nextQty = prev[idx]!.quantity + delta;
      if (nextQty <= 0) {
        return prev.filter((_, i) => i !== idx);
      }
      const copy = [...prev];
      copy[idx] = { ...copy[idx]!, quantity: nextQty };
      return copy;
    });
  }, []);

  const upsertLine = useCallback(
    (params: {
      menuItemId: string;
      quantity: number;
      modifiers: OrderLineModifierSelectionInput[];
      allergens: string[];
    }) => {
      const key = cartLineKey(params.menuItemId, params.modifiers);
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.key === key);
        if (params.quantity <= 0) {
          if (idx === -1) return prev;
          return prev.filter((_, i) => i !== idx);
        }
        const row: CartLine = {
          key,
          menuItemId: params.menuItemId,
          quantity: params.quantity,
          modifiers: params.modifiers,
          allergens: params.allergens,
        };
        if (idx === -1) return [...prev, row];
        const copy = [...prev];
        copy[idx] = row;
        return copy;
      });
    },
    [],
  );

  const removeLine = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo(
    () => ({
      lines,
      pickupDelayMinutes,
      setPickupDelayMinutes,
      bumpSimpleQuantity,
      upsertLine,
      removeLine,
      clear,
    }),
    [lines, pickupDelayMinutes, bumpSimpleQuantity, upsertLine, removeLine, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart requires CartProvider');
  return ctx;
}
