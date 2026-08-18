import { describe, expect, it } from 'vitest';
import type { CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import { itemDraftDirty, toDraft } from './menu-item-draft.js';

const item: NormalisedMenuItem = {
  id: '1',
  posItemId: 'sq',
  name: 'Latte',
  description: null,
  priceMinor: 380,
  currency: 'GBP',
  category: 'coffee',
  subcategory: null,
  imageUrl: null,
  imageSource: null,
  useDefaultImage: true,
  emoji: null,
  isAvailable: true,
  sizes: [],
  modifierGroups: [],
  tags: [],
  archetype: null,
  waiveMilkSurcharge: false,
  allowNoMilk: false,
};

const library: CafeModifierGroup[] = [];

describe('itemDraftDirty', () => {
  it('is clean for an unmodified draft', () => {
    expect(itemDraftDirty(toDraft(item, library), item, library)).toBe(false);
  });

  it('is dirty when a recipe-related field changes', () => {
    const draft = { ...toDraft(item, library), waiveMilkSurcharge: true };
    expect(itemDraftDirty(draft, item, library)).toBe(true);
  });

  it('ignores availability because On the menu PATCHes immediately', () => {
    const draft = { ...toDraft(item, library), isAvailable: false };
    expect(itemDraftDirty(draft, item, library)).toBe(false);
  });
});
