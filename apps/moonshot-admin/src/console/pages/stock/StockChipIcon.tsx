import type { StockChipKey } from '@moonshot/types';
import { Coffee, CoffeeBean, Cookie, Cow, Drop, Spinner, type Icon } from '@phosphor-icons/react';

export const STOCK_CHIP_ICONS: Record<StockChipKey, Icon> = {
  milk: Cow,
  beans: CoffeeBean,
  syrup: Drop,
  shots: Coffee,
  toppings: Spinner,
  food: Cookie,
};

export function StockChipIcon({ chip }: { chip: StockChipKey }) {
  const ChipIcon = STOCK_CHIP_ICONS[chip];
  return <ChipIcon size={18} weight="regular" />;
}
