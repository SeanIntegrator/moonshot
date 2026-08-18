import { describe, expect, it } from 'vitest';
import { STOCK_CHIP_ICONS } from './StockChipIcon.js';

describe('STOCK_CHIP_ICONS', () => {
  it('covers every option chip', () => {
    expect(Object.keys(STOCK_CHIP_ICONS).sort()).toEqual(
      ['beans', 'food', 'milk', 'shots', 'syrup', 'toppings'].sort(),
    );
  });
});
