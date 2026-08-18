import type { StockChipKey } from '@moonshot/types';

export const STOCK_CHIP_OPTIONS: ReadonlyArray<{ value: StockChipKey; label: string }> = [
  { value: 'milk', label: 'Milk' },
  { value: 'syrup', label: 'Syrup' },
  { value: 'beans', label: 'Beans' },
  { value: 'shots', label: 'Shots' },
  { value: 'toppings', label: 'Toppings' },
  { value: 'food', label: 'Food' },
];
