import { describe, expect, it } from 'vitest';
import type { AdminStockResponse } from '@moonshot/types';
import { outOfStockSections } from './out-of-stock.js';

const stock: AdminStockResponse = {
  drinksAffectedCount: 2,
  options: [
    {
      optionId: 'o1',
      groupId: 'g-milk',
      groupName: 'Milks',
      name: 'Whole',
      chip: 'milk',
      availability: 'out_today',
      usedOnCount: 4,
    },
    {
      optionId: 'o2',
      groupId: 'g-milk',
      groupName: 'Milks',
      name: 'Oat',
      chip: 'milk',
      availability: 'out_today',
      usedOnCount: 4,
    },
    {
      optionId: 'o3',
      groupId: 'g-syrup',
      groupName: 'Syrups',
      name: 'Vanilla',
      chip: 'flavours',
      availability: 'out',
      usedOnCount: 2,
    },
    {
      optionId: 'o-in',
      groupId: 'g-milk',
      groupName: 'Milks',
      name: 'Skim',
      chip: 'milk',
      availability: 'in',
      usedOnCount: 4,
    },
  ],
  food: [
    { itemId: 'f1', name: 'croissant', availability: 'out' },
    { itemId: 'f2', name: 'banana bread', availability: 'in' },
  ],
};

describe('outOfStockSections', () => {
  it('groups out options by modifier group and appends Food', () => {
    const sections = outOfStockSections(stock);
    expect(sections).toEqual([
      {
        key: 'g-milk',
        title: 'Milks',
        items: [
          { id: 'o1', name: 'Whole', chipTone: 'amber', chipLabel: 'Out today' },
          { id: 'o2', name: 'Oat', chipTone: 'amber', chipLabel: 'Out today' },
        ],
      },
      {
        key: 'g-syrup',
        title: 'Syrups',
        items: [{ id: 'o3', name: 'Vanilla', chipTone: 'red', chipLabel: 'Out' }],
      },
      {
        key: 'food',
        title: 'Food',
        items: [{ id: 'f1', name: 'croissant', chipTone: 'red', chipLabel: 'Off the menu' }],
      },
    ]);
  });

  it('returns empty when nothing is out', () => {
    expect(
      outOfStockSections({
        drinksAffectedCount: 0,
        options: stock.options.map((row) => ({ ...row, availability: 'in' })),
        food: stock.food.map((row) => ({ ...row, availability: 'in' })),
      }),
    ).toEqual([]);
  });
});
