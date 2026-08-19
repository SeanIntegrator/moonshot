import { describe, expect, it } from 'vitest';
import type { CafeModifierGroup } from '@moonshot/types';
import {
  addOption,
  ensureDefaultOption,
  groupHasValidDefaults,
  removeOption,
  setDefault,
  setRequired,
  updateOption,
} from './modifier-option-draft.js';

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
    slot: 'shots',
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

  it('does not clear the last default on a required multi-select list', () => {
    const g = group({ selectionType: 'multi', required: true });
    const next = setDefault(g, 'a', false);
    expect(next).toBe(g);
    expect(next.options.map((o) => o.isDefault)).toEqual([true, false]);
  });

  it('does not clear the default on a required single-select list', () => {
    const g = group({ required: true });
    const next = setDefault(g, 'a', false);
    expect(next).toBe(g);
  });
});

describe('setRequired', () => {
  it('sets the first option as default when enabling required with none selected', () => {
    const g = group({
      required: false,
      options: [
        { ...group().options[0]!, isDefault: false },
        { ...group().options[1]!, isDefault: false },
      ],
    });
    const next = setRequired(g, true);
    expect(next.required).toBe(true);
    expect(next.options.map((o) => o.isDefault)).toEqual([true, false]);
  });
});

describe('ensureDefaultOption', () => {
  it('promotes the first option when required and none are default', () => {
    const g = group({
      options: [
        { ...group().options[0]!, isDefault: false },
        { ...group().options[1]!, isDefault: false },
      ],
    });
    const next = ensureDefaultOption(g);
    expect(next.options.map((o) => o.isDefault)).toEqual([true, false]);
  });
});

describe('groupHasValidDefaults', () => {
  it('passes optional lists with no defaults', () => {
    const g = group({
      required: false,
      options: [
        { ...group().options[0]!, isDefault: false },
        { ...group().options[1]!, isDefault: false },
      ],
    });
    expect(groupHasValidDefaults(g)).toBe(true);
  });

  it('fails required lists with no defaults', () => {
    const g = group({
      options: [
        { ...group().options[0]!, isDefault: false },
        { ...group().options[1]!, isDefault: false },
      ],
    });
    expect(groupHasValidDefaults(g)).toBe(false);
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

  it('promotes another default when removing the default on a required list', () => {
    const next = removeOption(group(), 'a');
    expect(next.options.map((o) => o.id)).toEqual(['b']);
    expect(next.options[0]?.isDefault).toBe(true);
  });
});

describe('addOption', () => {
  it('sets the first default when adding to a required list with none selected', () => {
    const g = group({
      options: [{ ...group().options[0]!, isDefault: false }],
    });
    const added = {
      id: 'c',
      posOptionId: null,
      name: 'Triple',
      priceMinor: 0,
      isDefault: false,
      colorHex: null,
      chipLabel: '3',
    };
    const next = addOption(g, added);
    expect(next.options.map((o) => o.isDefault)).toEqual([true, false]);
  });
});
