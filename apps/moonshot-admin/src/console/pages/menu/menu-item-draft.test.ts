import { describe, expect, it } from 'vitest';
import type { CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import { itemDraftDirty, itemPatchBody, toDraft, toggleAttachedGroup } from './menu-item-draft.js';

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

const library: CafeModifierGroup[] = [
  {
    id: 'milk',
    name: 'Milk',
    selectionType: 'single',
    required: true,
    options: [],
    sortOrder: 0,
    posGroupId: 'MODLIST_MILK',
  },
  {
    id: 'shots',
    name: 'Shots',
    selectionType: 'single',
    required: true,
    options: [],
    sortOrder: 1,
    posGroupId: null,
  },
];

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

describe('toggleAttachedGroup', () => {
  it('does not toggle Square-owned lists', () => {
    const draft = toDraft(item, library);
    expect(toggleAttachedGroup(draft, 'milk', library).attachedGroupIds).toEqual([]);
  });

  it('toggles Moonshot-owned lists', () => {
    const draft = toDraft(item, library);
    expect(toggleAttachedGroup(draft, 'shots', library).attachedGroupIds).toEqual(['shots']);
  });
});

describe('itemPatchBody', () => {
  it('omits catalogue fields for POS-linked items', () => {
    const body = itemPatchBody(toDraft(item, library));
    expect(body).not.toHaveProperty('name');
    expect(body).not.toHaveProperty('priceMinor');
    expect(body).not.toHaveProperty('sizes');
    expect(body).not.toHaveProperty('category');
    expect(body).toMatchObject({
      waiveMilkSurcharge: false,
      allowNoMilk: false,
    });
  });

  it('includes catalogue fields for Moonshot-owned items', () => {
    const body = itemPatchBody(toDraft({ ...item, posItemId: null }, library));
    expect(body.name).toBe('Latte');
    expect(body.priceMinor).toBe(380);
    expect(body.category).toBe('coffee');
  });
});
