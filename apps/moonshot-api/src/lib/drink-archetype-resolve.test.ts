import {
  defaultAllowNoMilk,
  inferDrinkArchetypeFromName,
  platformDrinkArchetypeConfig,
  resolveCafeArchetypeRecipe,
} from '@moonshot/types';
import { describe, expect, it } from 'vitest';
import {
  libraryByNameFromGroups,
  resolveArchetypeGroups,
} from './drink-archetype-resolve.js';
import { applyMilkSurchargeWaiver } from './menu-map.js';

describe('defaultAllowNoMilk', () => {
  it('defaults tea and low-milk-iced on', () => {
    expect(defaultAllowNoMilk('tea')).toBe(true);
    expect(defaultAllowNoMilk('low-milk-iced')).toBe(true);
  });

  it('defaults americano on via template key or name; macchiato/cortado off', () => {
    expect(defaultAllowNoMilk('low-milk-hot')).toBe(false);
    expect(defaultAllowNoMilk('low-milk-hot', { templateKey: 'americano' })).toBe(true);
    expect(defaultAllowNoMilk('low-milk-hot', { name: 'Americano' })).toBe(true);
    expect(defaultAllowNoMilk('low-milk-hot', { templateKey: 'macchiato' })).toBe(false);
    expect(defaultAllowNoMilk('low-milk-hot', { name: 'Macchiato' })).toBe(false);
    expect(defaultAllowNoMilk('low-milk-hot', { name: 'Cortado' })).toBe(false);
  });

  it('defaults milk-forward drinks off', () => {
    expect(defaultAllowNoMilk('milk-forward-hot')).toBe(false);
    expect(defaultAllowNoMilk('espresso-neat')).toBe(false);
  });
});

describe('inferDrinkArchetypeFromName', () => {
  it('matches iced drinks before hot namesakes', () => {
    expect(inferDrinkArchetypeFromName('Iced Latte')).toBe('milk-forward-iced');
    expect(inferDrinkArchetypeFromName('Latte')).toBe('milk-forward-hot');
    expect(inferDrinkArchetypeFromName('Iced Americano')).toBe('low-milk-iced');
    expect(inferDrinkArchetypeFromName('Americano')).toBe('low-milk-hot');
  });

  it('matches macchiato and espresso', () => {
    expect(inferDrinkArchetypeFromName('Macchiato')).toBe('low-milk-hot');
    expect(inferDrinkArchetypeFromName('Espresso')).toBe('espresso-neat');
  });

  it('returns null for unknown names', () => {
    expect(inferDrinkArchetypeFromName('Babycino')).toBeNull();
    expect(inferDrinkArchetypeFromName('Croissant')).toBeNull();
  });
});

describe('resolveArchetypeGroups', () => {
  const library = libraryByNameFromGroups([
    { id: 'milks', name: 'Milks', options: [{}] },
    { id: 'syrups', name: 'Syrups', options: [{}] },
    { id: 'shots', name: 'Shots', options: [{}] },
    { id: 'beans', name: 'Beans', options: [{}] },
    { id: 'temp', name: 'Milk Temperature', options: [{}] },
    { id: 'texture', name: 'Milk Texture', options: [{}] },
    { id: 'ice', name: 'Ice Level', options: [{}] },
    { id: 'toppings', name: 'Toppings', options: [{}] },
  ]);

  it('resolves espresso-neat without milk', () => {
    const result = resolveArchetypeGroups('espresso-neat', platformDrinkArchetypeConfig(), library);
    expect(result.groupIds).toEqual(['shots', 'beans']);
    expect(result.waiveMilkSurcharge).toBe(false);
  });

  it('resolves low-milk-hot with waive', () => {
    const result = resolveArchetypeGroups('low-milk-hot', platformDrinkArchetypeConfig(), library);
    expect(result.groupIds).toEqual(['milks', 'shots', 'beans']);
    expect(result.waiveMilkSurcharge).toBe(true);
  });

  it('skips empty syrups group', () => {
    const lib = libraryByNameFromGroups([
      { id: 'milks', name: 'Milks', options: [{}] },
      { id: 'syrups', name: 'Syrups', options: [] },
      { id: 'shots', name: 'Shots', options: [{}] },
      { id: 'beans', name: 'Beans', options: [{}] },
      { id: 'temp', name: 'Milk Temperature', options: [{}] },
      { id: 'texture', name: 'Milk Texture', options: [{}] },
    ]);
    const result = resolveArchetypeGroups('milk-forward-hot', null, lib);
    expect(result.groupIds).not.toContain('syrups');
    expect(result.groupIds).toContain('milks');
    expect(result.groupIds).toContain('texture');
  });

  it('honours café recipe overrides', () => {
    const config = {
      'milk-forward-hot': {
        slots: ['milk', 'shots'] as const,
        milkCharge: 'waived' as const,
      },
    };
    const recipe = resolveCafeArchetypeRecipe('milk-forward-hot', config);
    expect(recipe.slots).toEqual(['milk', 'shots']);
    expect(recipe.milkCharge).toBe('waived');
    const result = resolveArchetypeGroups('milk-forward-hot', config, library);
    expect(result.groupIds).toEqual(['milks', 'shots']);
    expect(result.waiveMilkSurcharge).toBe(true);
  });
});

describe('applyMilkSurchargeWaiver', () => {
  it('zeros Milks option prices when waived', () => {
    const groups = applyMilkSurchargeWaiver(
      [
        {
          id: 'm',
          name: 'Milks',
          selectionType: 'single',
          required: true,
          options: [
            { id: 'w', posOptionId: null, name: 'Whole', priceMinor: 0, isDefault: true },
            { id: 'o', posOptionId: null, name: 'Oat', priceMinor: 50, isDefault: false },
          ],
        },
        {
          id: 's',
          name: 'Syrups',
          selectionType: 'multi',
          required: false,
          options: [
            { id: 'v', posOptionId: null, name: 'Vanilla', priceMinor: 30, isDefault: false },
          ],
        },
      ],
      true,
    );
    expect(groups[0]!.options.map((o) => o.priceMinor)).toEqual([0, 0]);
    expect(groups[1]!.options[0]!.priceMinor).toBe(30);
  });
});
