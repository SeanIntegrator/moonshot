import type { ModifierFamily, StockChipKey } from '@moonshot/types';
import { MODIFIER_FAMILY_LABELS } from '@moonshot/types';

export const STOCK_CHIP_OPTIONS: ReadonlyArray<{ value: StockChipKey; label: string }> = [
  ...(Object.entries(MODIFIER_FAMILY_LABELS) as Array<[ModifierFamily, string]>).map(
    ([value, label]) => ({ value, label }),
  ),
  { value: 'food', label: 'Food' },
];
