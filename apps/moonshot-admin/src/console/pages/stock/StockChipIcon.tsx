import type { StockChipKey } from '@moonshot/types';
import {
  Coffee,
  Cookie,
  Cow,
  Drop,
  Flask,
  Question,
  type Icon,
} from '@phosphor-icons/react';

export const STOCK_CHIP_ICONS: Record<StockChipKey, Icon> = {
  milk: Cow,
  coffee: Coffee,
  flavours: Drop,
  preparation: Flask,
  other: Question,
  food: Cookie,
};

export function StockChipIcon({ chip }: { chip: StockChipKey }) {
  const ChipIcon = STOCK_CHIP_ICONS[chip];
  return <ChipIcon size={18} weight="regular" />;
}
