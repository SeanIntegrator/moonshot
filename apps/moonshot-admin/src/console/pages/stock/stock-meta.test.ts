import { describe, expect, it } from 'vitest';
import type { AdminStockOptionRow } from '@moonshot/types';
import {
  foodStockMeta,
  groupStockOptions,
  optionStockMeta,
  stockInitials,
  usedOnLabel,
} from './stock-meta.js';

describe('stock meta copy', () => {
  it('labels drink counts', () => {
    expect(usedOnLabel(0)).toBe('on 0 drinks');
    expect(usedOnLabel(1)).toBe('on 1 drink');
    expect(usedOnLabel(12)).toBe('on 12 drinks');
  });

  it('uses out-today / out sentences from the design', () => {
    expect(optionStockMeta('in', 10)).toBe('on 10 drinks');
    expect(optionStockMeta('out_today', 12)).toBe('Back when you open tomorrow · on 12 drinks');
    expect(optionStockMeta('out', 9)).toBe('Until you turn it back on · on 9 drinks');
  });

  it('marks food as off the menu when out', () => {
    expect(foodStockMeta('in')).toBe('On the menu');
    expect(foodStockMeta('out')).toBe('Off the menu');
  });

  it('takes two-letter initials from the name', () => {
    expect(stockInitials('Whole')).toBe('Wh');
    expect(stockInitials('Oat')).toBe('Oa');
    expect(stockInitials('House blend')).toBe('Ho');
    expect(stockInitials('A')).toBe('A');
    expect(stockInitials('')).toBe('?');
  });
});

describe('groupStockOptions', () => {
  it('groups rows by groupId and keeps usedOnCount', () => {
    const rows: AdminStockOptionRow[] = [
      {
        optionId: '1',
        groupId: 'g1',
        groupName: 'Milks',
        name: 'Whole',
        chip: 'milk',
        availability: 'in',
        usedOnCount: 21,
      },
      {
        optionId: '2',
        groupId: 'g1',
        groupName: 'Milks',
        name: 'Oat',
        chip: 'milk',
        availability: 'out_today',
        usedOnCount: 21,
      },
      {
        optionId: '3',
        groupId: 'g2',
        groupName: 'Syrups',
        name: 'Vanilla',
        chip: 'flavours',
        availability: 'in',
        usedOnCount: 9,
      },
    ];
    const groups = groupStockOptions(rows);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toMatchObject({ groupName: 'Milks', usedOnCount: 21 });
    expect(groups[0]!.options).toHaveLength(2);
    expect(groups[1]).toMatchObject({ groupName: 'Syrups', usedOnCount: 9 });
  });
});
