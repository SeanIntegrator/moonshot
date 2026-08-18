import { describe, expect, it } from 'vitest';
import { classifyModifierChip } from './modifier-chips.js';

describe('classifyModifierChip', () => {
  it('maps common library names', () => {
    expect(classifyModifierChip('Milks')).toBe('milk');
    expect(classifyModifierChip('Syrups')).toBe('syrup');
    expect(classifyModifierChip('Shots')).toBe('shots');
    expect(classifyModifierChip('Beans')).toBe('beans');
    expect(classifyModifierChip('Milk Temperature')).toBe('shots');
    expect(classifyModifierChip('Toppings')).toBe('toppings');
  });
});
