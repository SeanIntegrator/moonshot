import { describe, expect, it } from 'vitest';
import type { CafeModifierGroup } from '@moonshot/types';
import { removeOption, setDefault, updateOption } from './modifier-option-draft.js';

function group(over: Partial<CafeModifierGroup> = {}): CafeModifierGroup {
  return {
    id: 'g1',
    name: 'Shots',
    selectionType: 'single',
    required: true,
    options: [
      {
        id: 'a',
        posOptionId: null,
        name: 'Single',
        priceMinor: 0,
        isDefault: true,
        colorHex: null,
        chipLabel: '1',
      },
      {
        id: 'b',
        posOptionId: null,
        name: 'Double',
        priceMinor: 0,
        isDefault: false,
        colorHex: null,
        chipLabel: '2',
      },
    ],
    sortOrder: 0,
    posGroupId: null,
    ...over,
  };
}

describe('updateOption', () => {
  it('patches one option by id', () => {
    const next = updateOption(group(), 'b', { name: 'Triple', priceMinor: 50 });
    expect(next.options[1]?.name).toBe('Triple');
    expect(next.options[1]?.priceMinor).toBe(50);
    expect(next.options[0]?.name).toBe('Single');
  });
});

describe('setDefault', () => {
  it('keeps a single default for single-select lists', () => {
    const next = setDefault(group(), 'b', true);
    expect(next.options.map((o) => o.isDefault)).toEqual([false, true]);
  });

  it('toggles independently on multi-select lists', () => {
    const next = setDefault(group({ selectionType: 'multi' }), 'b', true);
    expect(next.options.map((o) => o.isDefault)).toEqual([true, true]);
  });
});

describe('removeOption', () => {
  it('drops the option when more than one remains', () => {
    expect(removeOption(group(), 'b').options.map((o) => o.id)).toEqual(['a']);
  });

  it('keeps the last option', () => {
    const one = group({ options: [group().options[0]!] });
    expect(removeOption(one, 'a')).toBe(one);
  });
});
