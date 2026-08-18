import { describe, expect, it } from 'vitest';
import { classifyStockChip } from './stock-chip.js';

describe('classifyStockChip', () => {
  it('maps milk and syrup aliases', () => {
    expect(classifyStockChip('Milks')).toBe('milk');
    expect(classifyStockChip('Alt milk')).toBe('milk');
    expect(classifyStockChip('Syrups')).toBe('syrup');
    expect(classifyStockChip('Flavour')).toBe('syrup');
  });

  it('maps Moonshot prep lists', () => {
    expect(classifyStockChip('Shots')).toBe('shots');
    expect(classifyStockChip('Beans')).toBe('beans');
    expect(classifyStockChip('Milk Temperature')).toBe('shots');
    expect(classifyStockChip('Toppings')).toBe('toppings');
  });

  it('falls unknown lists onto toppings', () => {
    expect(classifyStockChip('Seasonal extras')).toBe('toppings');
  });
});
