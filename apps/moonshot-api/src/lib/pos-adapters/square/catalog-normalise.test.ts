import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CatalogObject } from 'square';
import { normaliseSquareCatalog, mapCategoryToSectionKey } from './catalog-normalise.js';
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
  it('maps Square category names onto system section keys', () => {
    expect(mapCategoryToSectionKey('Hot drinks')).toBe('hot_drinks');
    expect(mapCategoryToSectionKey('Food')).toBe('food');
    expect(mapCategoryToSectionKey('Seasonal Specials')).toBe('seasonal_specials');
  });

  it('normalises items, sizes, and Square modifier lists from fixture', () => {
    const snapshot = loadFixture();
    const { menu, groupsByPosId, roleHints } = normaliseSquareCatalog('cafe-1', snapshot);

    expect(menu.items).toHaveLength(3);
    expect(roleHints.get('LIST_MILKS')).toBe('milk');
    expect(roleHints.get('LIST_SYRUPS')).toBe('syrup');

    const milks = groupsByPosId.get('LIST_MILKS');
    expect(milks?.name).toBe('Milk Options');
    expect(milks?.options).toHaveLength(2);
    expect(milks?.options.find((o) => o.name === 'Oat')?.priceMinor).toBe(50);
    expect(milks?.options.find((o) => o.name === 'Oat')?.chipLabel).toBe('Oa');

    const latte = menu.items.find((i) => i.name === 'Latte')!;
    expect(latte.posItemId).toBe('ITEM_LATTE');
    expect(latte.category).toBe('hot_drinks');
    expect(latte.priceMinor).toBe(350);
    expect(latte.sizes).toHaveLength(0);
    expect(latte.modifierGroups.map((g) => g.name)).toEqual(['Milk Options', 'Syrups']);

    const americano = menu.items.find((i) => i.name === 'Americano')!;
    expect(americano.sizes).toHaveLength(2);
    expect(americano.sizes[0]?.isDefault).toBe(true);
    expect(americano.sizes[1]?.priceMinor).toBe(350);

    const cookie = menu.items.find((i) => i.name === 'Oat cookie')!;
    expect(cookie.category).toBe('food');
    expect(cookie.modifierGroups).toHaveLength(0);

    expect(menu.sections.some((s) => s.key === 'food' && s.enabled)).toBe(true);
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
    const { menu, deletedPosItemIds } = normaliseSquareCatalog('cafe-1', snapshot);
    expect(menu.items.find((i) => i.posItemId === 'ITEM_GONE')).toBeUndefined();
    expect(deletedPosItemIds).toContain('ITEM_GONE');
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
    const { menu } = normaliseSquareCatalog('cafe-1', snapshot);
    expect(menu.items.find((i) => i.posItemId === 'ITEM_LATTE')?.imageUrl).toBe(
      'https://square-cdn.example/latte.jpg',
    );
    expect(menu.items.find((i) => i.posItemId === 'ITEM_AMERICANO')?.imageUrl ?? null).toBeNull();
  });

  it('includes deleted items as unavailable when includeDeletedItems is set', () => {
    const snapshot = loadFixture();
    snapshot.items.push({
      type: 'ITEM',
      id: 'ITEM_DEL',
      isDeleted: true,
      itemData: { name: 'Deleted Latte', variations: [] },
    });
    const { menu, deletedPosItemIds } = normaliseSquareCatalog('cafe-1', snapshot, {
      includeDeletedItems: true,
    });
    expect(deletedPosItemIds).toContain('ITEM_DEL');
    const del = menu.items.find((i) => i.posItemId === 'ITEM_DEL');
    expect(del?.isAvailable).toBe(false);
  });
});
