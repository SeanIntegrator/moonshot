import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CatalogObject } from 'square';
import { normaliseSquareCatalog } from './catalog-normalise.js';
import type { SquareCatalogSnapshot } from './catalog-fetch.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturePath = join(
  __dirname,
  '../../../../fixtures/pos/square/sandbox-catalog-snapshot.json',
);

function loadFixture(): SquareCatalogSnapshot {
  const raw = JSON.parse(readFileSync(fixturePath, 'utf8')) as Partial<SquareCatalogSnapshot>;
  return {
    items: raw.items ?? [],
    categories: raw.categories ?? [],
    modifierLists: raw.modifierLists ?? [],
    images: raw.images ?? [],
    latestTime: raw.latestTime ?? new Date().toISOString(),
  };
}

describe('catalog-normalise', () => {
  it('mirrors Square category names as section keys (not forced system keys)', () => {
    const snapshot = loadFixture();
    const catalog = normaliseSquareCatalog('cafe-1', snapshot);
    expect(catalog.sections.some((s) => s.key === 'hot_drinks' && s.posCategoryId === 'CAT_HOT')).toBe(
      true,
    );
    expect(catalog.sections.some((s) => s.key === 'food' && s.kind === 'food')).toBe(true);
  });

  it('normalises items, sizes, and Square modifier lists from fixture', () => {
    const snapshot = loadFixture();
    const catalog = normaliseSquareCatalog('cafe-1', snapshot);

    expect(catalog.items).toHaveLength(3);
    expect(catalog.groupsByPosId.get('LIST_MILKS')?.role).toBe('other');
    expect(catalog.groupsByPosId.get('LIST_SYRUPS')?.role).toBe('other');

    const milks = catalog.groupsByPosId.get('LIST_MILKS');
    expect(milks?.name).toBe('Milk Options');
    expect(milks?.options).toHaveLength(2);
    expect(milks?.options.find((o) => o.name === 'Oat')?.priceMinor).toBe(50);
    expect(milks?.options.find((o) => o.name === 'Oat')?.chipLabel).toBe('Oa');

    const latte = catalog.items.find((i) => i.name === 'Latte')!;
    expect(latte.posItemId).toBe('ITEM_LATTE');
    expect(latte.category).toBe('hot_drinks');
    expect(latte.priceMinor).toBe(350);
    expect(latte.sizes).toHaveLength(0);
    expect(latte.modifierGroups.map((g) => g.name)).toEqual(['Milk Options', 'Syrups']);
    expect(latte.archetype).toBeNull();

    const americano = catalog.items.find((i) => i.name === 'Americano')!;
    expect(americano.sizes).toHaveLength(2);
    expect(americano.sizes[0]?.isDefault).toBe(true);
    expect(americano.sizes[1]?.priceMinor).toBe(350);

    const cookie = catalog.items.find((i) => i.name === 'Oat cookie')!;
    expect(cookie.category).toBe('food');
    expect(cookie.modifierGroups).toHaveLength(0);

    expect(catalog.sections.some((s) => s.key === 'food' && s.enabled)).toBe(true);
  });

  it('does not auto-attach Moonshot prep groups', () => {
    const snapshot = loadFixture();
    const catalog = normaliseSquareCatalog('cafe-1', snapshot);
    for (const item of catalog.items) {
      expect(item.modifierGroups.every((g) => !['Shots', 'Beans'].includes(g.name))).toBe(true);
      expect(item.archetype).toBeNull();
    }
  });

  it('skips archived / deleted items', () => {
    const snapshot = loadFixture();
    const archived: CatalogObject.Item = {
      type: 'ITEM',
      id: 'ITEM_GONE',
      isDeleted: false,
      itemData: {
        name: 'Gone',
        isArchived: true,
        variations: [],
      },
    };
    snapshot.items.push(archived);
    const catalog = normaliseSquareCatalog('cafe-1', snapshot);
    expect(catalog.items.find((i) => i.posItemId === 'ITEM_GONE')).toBeUndefined();
    expect(catalog.deletedPosItemIds).toContain('ITEM_GONE');
  });

  it('maps CatalogImage onto item imageUrl', () => {
    const snapshot = loadFixture();
    snapshot.images = [
      {
        type: 'IMAGE',
        id: 'IMG_1',
        isDeleted: false,
        imageData: { url: 'https://square-cdn.example/latte.jpg' },
      },
    ];
    const latte = snapshot.items.find((i) => i.id === 'ITEM_LATTE');
    if (latte?.itemData) {
      latte.itemData.imageIds = ['IMG_1'];
    }
    const catalog = normaliseSquareCatalog('cafe-1', snapshot);
    expect(catalog.items.find((i) => i.posItemId === 'ITEM_LATTE')?.imageUrl).toBe(
      'https://square-cdn.example/latte.jpg',
    );
  });

  it('preserves existing section keys across Square renames via posCategoryId', () => {
    const snapshot = loadFixture();
    const existing = new Map([['CAT_HOT', 'coffee']]);
    const catalog = normaliseSquareCatalog('cafe-1', snapshot, {
      existingKeyByPosCategoryId: existing,
    });
    expect(catalog.sections.find((s) => s.posCategoryId === 'CAT_HOT')?.key).toBe('coffee');
    expect(catalog.items.find((i) => i.posItemId === 'ITEM_LATTE')?.category).toBe('coffee');
    // Label still reflects Square's current name.
    expect(catalog.sections.find((s) => s.posCategoryId === 'CAT_HOT')?.label).toBe('Hot drinks');
  });

  it('places items using existing DB category keys when CATEGORY is absent from the snapshot', () => {
    // Incremental item-only delta: Ham references Savory, but Savory is not in the snapshot.
    const snapshot: SquareCatalogSnapshot = {
      items: [
        {
          type: 'ITEM',
          id: 'ITEM_HAM',
          isDeleted: false,
          itemData: {
            name: 'Ham and Cheese Croissant',
            reportingCategory: { id: 'CAT_SAVORY' },
            variations: [
              {
                type: 'ITEM_VARIATION',
                id: 'VAR_HAM',
                isDeleted: false,
                itemVariationData: {
                  name: 'Regular',
                  priceMoney: { amount: 500n, currency: 'GBP' },
                },
              },
            ],
          },
        },
      ],
      categories: [],
      modifierLists: [],
      images: [],
      latestTime: new Date().toISOString(),
    };
    const catalog = normaliseSquareCatalog('cafe-1', snapshot, {
      existingKeyByPosCategoryId: new Map([['CAT_SAVORY', 'savory']]),
    });
    expect(catalog.items.find((i) => i.posItemId === 'ITEM_HAM')?.category).toBe('savory');
    expect(catalog.sections.some((s) => s.key === 'uncategorised')).toBe(false);
  });

  it('keeps unused live categories from the snapshot (empty leaves)', () => {
    const snapshot: SquareCatalogSnapshot = {
      items: [],
      categories: [
        {
          type: 'CATEGORY',
          id: 'CAT_FOOD',
          isDeleted: false,
          categoryData: { name: 'Food', isTopLevel: true },
        },
        {
          type: 'CATEGORY',
          id: 'CAT_SAVORY',
          isDeleted: false,
          categoryData: {
            name: 'Savory',
            isTopLevel: false,
            parentCategory: { id: 'CAT_FOOD', ordinal: 0 },
          },
        },
      ],
      modifierLists: [],
      images: [],
      latestTime: new Date().toISOString(),
    };
    const catalog = normaliseSquareCatalog('cafe-1', snapshot);
    expect(catalog.sections.some((s) => s.key === 'savory' && s.parentKey === 'food')).toBe(true);
    expect(catalog.sections.some((s) => s.key === 'food')).toBe(true);
  });
});
