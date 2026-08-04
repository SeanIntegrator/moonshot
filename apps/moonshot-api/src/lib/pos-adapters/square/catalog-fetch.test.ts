import { describe, expect, it } from 'vitest';
import type { CatalogObject } from 'square';
import { collectReferencedCategoryIds } from './catalog-fetch.js';

describe('collectReferencedCategoryIds', () => {
  it('prefers reportingCategory and unions categories[] + legacy categoryId', () => {
    const items: CatalogObject.Item[] = [
      {
        type: 'ITEM',
        id: 'ITEM_1',
        isDeleted: false,
        itemData: {
          name: 'Ham',
          reportingCategory: { id: 'CAT_SAVORY' },
          categories: [{ id: 'CAT_FOOD' }, { id: 'CAT_SAVORY' }],
          categoryId: 'CAT_LEGACY',
        },
      },
      {
        type: 'ITEM',
        id: 'ITEM_2',
        isDeleted: true,
        itemData: {
          name: 'Gone',
          reportingCategory: { id: 'CAT_GONE' },
        },
      },
    ];
    expect(collectReferencedCategoryIds(items).sort()).toEqual(
      ['CAT_FOOD', 'CAT_LEGACY', 'CAT_SAVORY'].sort(),
    );
  });

  it('returns empty when items have no category refs', () => {
    expect(
      collectReferencedCategoryIds([
        { type: 'ITEM', id: 'ITEM_X', isDeleted: false, itemData: { name: 'X' } },
      ]),
    ).toEqual([]);
  });
});
