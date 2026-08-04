import { describe, expect, it } from 'vitest';
import { classifyModifierListRole } from '../pos-adapters/square/role-hints.js';
import { chipMetaForOptionName } from './menu-chip-palette.js';

describe('Square import layering helpers', () => {
  it('classifies Square list names into milk/syrup/topping roles', () => {
    expect(classifyModifierListRole('Milk Options')).toBe('milk');
    expect(classifyModifierListRole('Syrups')).toBe('syrup');
    expect(classifyModifierListRole('Toppings')).toBe('topping');
    expect(classifyModifierListRole('Extras')).toBe('topping');
    expect(classifyModifierListRole('Spice Level')).toBe('other');
  });

  it('name-matches chip colours for known milks and syrups', () => {
    expect(chipMetaForOptionName('Oat', 'milk').chipLabel).toBe('Oa');
    expect(chipMetaForOptionName('Oat', 'milk').colorHex).toBe('#f0e4d0');
    expect(chipMetaForOptionName('Almond', 'milk').colorHex).toBe('#ff2d87');
    expect(chipMetaForOptionName('Coconut', 'milk').colorHex).toBe('#4a8fd4');
    expect(chipMetaForOptionName('Soy', 'milk').colorHex).toBe('#145a32');
    expect(chipMetaForOptionName('Skinny', 'milk').colorHex).toBe('#c44548');
    expect(chipMetaForOptionName('Semi', 'milk').colorHex).toBe('#e6001a');
    expect(chipMetaForOptionName('Whole', 'milk').colorHex).toBe('#f7f4ee');
    expect(chipMetaForOptionName('Vanilla', 'syrup').chipLabel).toBe('Va');
    expect(chipMetaForOptionName('Mystery Foam', 'other').chipLabel).toBe('My');
    expect(chipMetaForOptionName('Mystery Foam', 'other').colorHex).toBeNull();
  });
});
