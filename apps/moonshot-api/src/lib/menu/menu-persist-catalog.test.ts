import { describe, expect, it } from 'vitest';
import { classifyModifierListRole } from './pos-adapters/square/role-hints.js';
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
    expect(chipMetaForOptionName('Oat', 'milk').colorHex).toBe('#e8dcc8');
    expect(chipMetaForOptionName('Vanilla', 'syrup').chipLabel).toBe('Va');
    expect(chipMetaForOptionName('Mystery Foam', 'other').chipLabel).toBe('My');
    expect(chipMetaForOptionName('Mystery Foam', 'other').colorHex).toBeNull();
  });
});
