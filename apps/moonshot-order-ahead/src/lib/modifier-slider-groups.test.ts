import type { NormalisedModifierGroup } from '@moonshot/types';
import { describe, expect, it } from 'vitest';
import {
  partitionModifierGroups,
  sortOptionsForSlider,
} from './modifier-slider-groups.js';

function group(
  name: string,
  optionNames: string[],
  defaultName?: string,
): NormalisedModifierGroup {
  return {
    id: name,
    name,
    selectionType: 'single',
    required: true,
    options: optionNames.map((n) => ({
      id: `${name}-${n}`,
      posOptionId: null,
      name: n,
      priceMinor: 0,
      isDefault: n === defaultName,
    })),
  };
}

describe('partitionModifierGroups', () => {
  it('pulls shots/temp/texture into additional and leaves beans in primary', () => {
    const groups = [
      group('Milks', ['Whole']),
      group('Syrups', ['Vanilla']),
      group('Shots', ['Single', 'Double'], 'Double'),
      group('Beans', ['House'], 'House'),
      group('Milk Temperature', ['Hot', 'Warm'], 'Hot'),
      group('Milk Texture', ['Standard', 'Wet'], 'Standard'),
    ];
    // Syrups is multi in real data but name matching is what matters here.
    groups[1]!.selectionType = 'multi';
    groups[1]!.required = false;

    const { primary, additional } = partitionModifierGroups(groups);
    expect(primary.map((g) => g.name)).toEqual(['Milks', 'Syrups', 'Beans']);
    expect(additional.map((g) => g.name)).toEqual([
      'Shots',
      'Milk Temperature',
      'Milk Texture',
    ]);
  });

  it('pulls Ice Level into additional and leaves Toppings in primary', () => {
    const groups = [
      group('Milks', ['Whole']),
      group('Toppings', ['Marshmallows']),
      group('Ice Level', ['Light', 'Regular', 'Extra'], 'Regular'),
    ];
    groups[1]!.selectionType = 'multi';
    groups[1]!.required = false;

    const { primary, additional } = partitionModifierGroups(groups);
    expect(primary.map((g) => g.name)).toEqual(['Milks', 'Toppings']);
    expect(additional.map((g) => g.name)).toEqual(['Ice Level']);
  });
});

describe('sortOptionsForSlider', () => {
  it('puts Warm leftmost for milk temperature', () => {
    const sorted = sortOptionsForSlider(
      'Milk Temperature',
      group('Milk Temperature', ['Hot', 'Warm', 'Extra Hot', 'Extra Extra Hot'], 'Hot').options,
    );
    expect(sorted.map((o) => o.name)).toEqual([
      'Warm',
      'Hot',
      'Extra Hot',
      'Extra Extra Hot',
    ]);
  });

  it('orders milk texture Wet → Standard → Dry', () => {
    const sorted = sortOptionsForSlider(
      'Milk Texture',
      group('Milk Texture', ['Standard', 'Wet', 'Dry', 'Extra Foam'], 'Standard').options,
    );
    expect(sorted.map((o) => o.name)).toEqual(['Wet', 'Standard', 'Dry', 'Extra Foam']);
  });
});
