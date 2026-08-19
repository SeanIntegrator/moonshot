import { defaultAllowNoMilk, inferDrinkArchetypeFromName, platformDrinkArchetypeConfig, resolveCafeArchetypeRecipe } from '@moonshot/domain';
import { describe, expect, it } from 'vitest';
import {
  libraryByNameFromGroups,
  resolveArchetypeGroups,
} from './drink-archetype-resolve.js';
import { applyMilkSurchargeWaiver } from './menu/menu-map.js';

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
    { id: 'milks', name: 'Milks', slot: 'milk', options: [{}] },
    { id: 'syrups', name: 'Syrups', slot: 'syrup', options: [{}] },
    { id: 'shots', name: 'Shots', slot: 'shots', options: [{}] },
    { id: 'beans', name: 'Beans', slot: 'beans', options: [{}] },
    { id: 'temp', name: 'Milk Temperature', slot: 'milk_temperature', options: [{}] },
    { id: 'texture', name: 'Milk Texture', slot: 'milk_texture', options: [{}] },
    { id: 'ice', name: 'Ice Level', slot: 'ice_level', options: [{}] },
    { id: 'toppings', name: 'Toppings', slot: 'toppings', options: [{}] },
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
      { id: 'milks', name: 'Milks', slot: 'milk', options: [{}] },
      { id: 'syrups', name: 'Syrups', slot: 'syrup', options: [] },
      { id: 'shots', name: 'Shots', slot: 'shots', options: [{}] },
      { id: 'beans', name: 'Beans', slot: 'beans', options: [{}] },
      { id: 'temp', name: 'Milk Temperature', slot: 'milk_temperature', options: [{}] },
      { id: 'texture', name: 'Milk Texture', slot: 'milk_texture', options: [{}] },
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

  it('filters to prep slots only (Square import layering)', () => {
    const result = resolveArchetypeGroups(
      'milk-forward-hot',
      platformDrinkArchetypeConfig(),
      library,
      {
        slotFilter: ['shots', 'beans', 'milk_temperature', 'milk_texture', 'ice_level', 'toppings'],
      },
    );
    expect(result.groupIds).toEqual(['shots', 'temp', 'texture', 'beans']);
    expect(result.groupIds).not.toContain('milks');
    expect(result.groupIds).not.toContain('syrups');
    expect(result.waiveMilkSurcharge).toBe(false);
  });

  it('resolves by slot when Square list name differs from Moonshot seed name', () => {
    const lib = libraryByNameFromGroups([
      { id: 'alt-milk', name: 'Dairy Options', slot: 'milk', options: [{}] },
      { id: 'shots', name: 'Shots', slot: 'shots', options: [{}] },
      { id: 'beans', name: 'Beans', slot: 'beans', options: [{}] },
    ]);
    const result = resolveArchetypeGroups('low-milk-hot', platformDrinkArchetypeConfig(), lib);
    expect(result.groupIds).toEqual(['alt-milk', 'shots', 'beans']);
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
