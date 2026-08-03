import { NO_MILK_OPTION_ID, type NormalisedModifierGroup } from '@moonshot/types';
import { describe, expect, it } from 'vitest';
import { applyAllowNoMilk } from './menu-map.js';

const milksGroup = (): NormalisedModifierGroup => ({
  id: 'g-milk',
  name: 'Milks',
  selectionType: 'single',
  required: true,
  options: [
    { id: 'o-whole', posOptionId: null, name: 'Whole', priceMinor: 0, isDefault: true },
    { id: 'o-oat', posOptionId: null, name: 'Oat', priceMinor: 50, isDefault: false },
  ],
});

describe('applyAllowNoMilk', () => {
  it('is a no-op when flag is false', () => {
    const groups = [milksGroup()];
    expect(applyAllowNoMilk(groups, false)).toEqual(groups);
  });

  it('injects No milk as default and clears other defaults', () => {
    const [milks] = applyAllowNoMilk([milksGroup()], true);
    expect(milks!.options[0]).toMatchObject({
      id: NO_MILK_OPTION_ID,
      name: 'No milk',
      priceMinor: 0,
      isDefault: true,
    });
    expect(milks!.options.filter((o) => o.isDefault)).toHaveLength(1);
    expect(milks!.options.find((o) => o.id === 'o-whole')?.isDefault).toBe(false);
  });

  it('leaves non-milk groups unchanged', () => {
    const syrup: NormalisedModifierGroup = {
      id: 'g-syrup',
      name: 'Syrups',
      selectionType: 'multi',
      required: false,
      options: [{ id: 'o-van', posOptionId: null, name: 'Vanilla', priceMinor: 40, isDefault: false }],
    };
    const [out] = applyAllowNoMilk([syrup], true);
    expect(out).toEqual(syrup);
  });
});
