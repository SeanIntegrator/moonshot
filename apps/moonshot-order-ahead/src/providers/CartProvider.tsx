import type { OrderLineModifierSelectionInput } from '@moonshot/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { PickupDelayMinutes } from '../lib/pickup-delay-options.js';
import { useCafeSlugFromRoute } from '../hooks/useCafePath.js';
import {
  asPickupDelayMinutes,
  clearCartStorage,
  readCartFromStorage,
  writeCartToStorage,
  type StoredCartLine,
} from '../lib/cart-storage.js';

export type CartLine = StoredCartLine;

function modifierKey(modifiers: OrderLineModifierSelectionInput[]): string {
  if (modifiers.length === 0) return '';
  return [...modifiers]
    .map((m) => `${m.groupId}:${m.optionId}`)
    .sort()
    .join('|');
}

function cartLineKey(
  menuItemId: string,
  modifiers: OrderLineModifierSelectionInput[],
  sizeId?: string | null,
): string {
  const parts = [menuItemId];
  if (sizeId) parts.push(`size:${sizeId}`);
  const mk = modifierKey(modifiers);
  if (mk) parts.push(mk);
  return parts.join('#');
}

type CartContextValue = {
  lines: CartLine[];
  /** Sum of line quantities — used by the Order tab badge and floating cart. */
  itemCount: number;
  pickupDelayMinutes: PickupDelayMinutes;
  setPickupDelayMinutes: (minutes: PickupDelayMinutes) => void;
  upsertLine: (params: {
    menuItemId: string;
    sizeId?: string | null;
    quantity: number;
    modifiers: OrderLineModifierSelectionInput[];
    allergens: string[];
  }) => void;
  removeLine: (key: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const cafeSlug = useCafeSlugFromRoute();
  const [lines, setLines] = useState<CartLine[]>(() => readCartFromStorage(cafeSlug).lines);
  const [pickupDelayMinutes, setPickupDelayMinutesState] = useState<PickupDelayMinutes>(() =>
    asPickupDelayMinutes(readCartFromStorage(cafeSlug).pickupDelayMinutes),
  );

  useEffect(() => {
    writeCartToStorage(cafeSlug, { lines, pickupDelayMinutes });
  }, [cafeSlug, lines, pickupDelayMinutes]);

  const setPickupDelayMinutes = useCallback((minutes: PickupDelayMinutes) => {
    setPickupDelayMinutesState(minutes);
  }, []);

  const upsertLine = useCallback(
    (params: {
      menuItemId: string;
      sizeId?: string | null;
      quantity: number;
      modifiers: OrderLineModifierSelectionInput[];
      allergens: string[];
    }) => {
      const sizeId = params.sizeId ?? null;
      const key = cartLineKey(params.menuItemId, params.modifiers, sizeId);
      setLines((prev) => {
        const idx = prev.findIndex((l) => l.key === key);
        if (params.quantity <= 0) {
          if (idx === -1) return prev;
          return prev.filter((_, i) => i !== idx);
        }
        const row: CartLine = {
          key,
          menuItemId: params.menuItemId,
          sizeId,
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

  const clear = useCallback(() => {
    setLines([]);
    setPickupDelayMinutesState(0);
    clearCartStorage(cafeSlug);
  }, [cafeSlug]);

  const itemCount = useMemo(() => lines.reduce((sum, l) => sum + l.quantity, 0), [lines]);

  const value = useMemo(
    () => ({
      lines,
      itemCount,
      pickupDelayMinutes,
      setPickupDelayMinutes,
      upsertLine,
      removeLine,
      clear,
    }),
    [lines, itemCount, pickupDelayMinutes, setPickupDelayMinutes, upsertLine, removeLine, clear],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart requires CartProvider');
  return ctx;
}
