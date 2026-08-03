import { describe, expect, it, vi } from 'vitest';
import type { PosCatalog, NormalisedMenuItem } from '@moonshot/types';
import { syncNormalisedMenuCatalog } from './menu-sync-catalog.js';

vi.mock('./pos-catalog/menu-catalog-upsert.js', async () => {
  const actual = await vi.importActual<typeof import('./pos-catalog/menu-catalog-upsert.js')>(
    './pos-catalog/menu-catalog-upsert.js',
  );
  return {
    ...actual,
    upsertPosCatalog: vi.fn(actual.upsertPosCatalog),
  };
});

vi.mock('./menu-modifier-library.js', () => ({
  setMenuItemModifierGroups: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./menu-image-storage.js', () => ({
  readMenuImageStorageConfig: vi.fn(() => ({
    bucket: 'b',
    endpoint: 'https://s3.example',
    region: 'auto',
    accessKeyId: 'k',
    secretAccessKey: 's',
    publicBaseUrl: 'https://api.example.com/api/v1/media',
  })),
}));

function item(overrides: Partial<NormalisedMenuItem> = {}): NormalisedMenuItem {
  return {
    id: 'local-1',
    name: 'Latte',
    description: null,
    priceMinor: 350,
    currency: 'GBP',
    category: 'hot_drinks',
    subcategory: null,
    imageUrl: null,
    imageSource: null,
    useDefaultImage: true,
    emoji: null,
    isAvailable: true,
    tags: [],
    sizes: [],
    modifierGroups: [],
    posItemId: 'ITEM_LATTE',
    archetype: null,
    waiveMilkSurcharge: false,
    allowNoMilk: false,
    ...overrides,
  };
}

function catalog(items: NormalisedMenuItem[] = [], deleted: string[] = []): PosCatalog {
  return {
    cafeId: 'cafe-1',
    sections: [],
    items,
    groupsByPosId: new Map(),
    deletedPosItemIds: deleted,
    fetchedAt: new Date().toISOString(),
  };
}

type QueryResult = { rows: unknown[]; rowCount?: number };

function createClient(handler: (sql: string, params?: unknown[]) => QueryResult) {
  return {
    query: vi.fn(async (sql: string, params?: unknown[]) => handler(sql, params)),
  };
}

function existingItemRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: 'mi-1',
    archetype: null,
    image_url: null,
    image_source: null,
    use_default_image: true,
    ...overrides,
  };
}

describe('syncNormalisedMenuCatalog', () => {
  it('updates price/name and Square image on existing pos-linked item', async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const client = createClient((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('drink_archetype_config') && sql.startsWith('SELECT')) {
        return { rows: [{ drink_archetype_config: {} }] };
      }
      if (sql.includes('FROM menu_items WHERE cafe_id') && sql.includes('pos_item_id')) {
        return { rows: [existingItemRow()] };
      }
      if (sql.includes('MAX(sort_order)')) {
        return { rows: [{ max: 0 }] };
      }
      if (sql.includes('FROM menu_sections') && sql.includes('kind =')) {
        return { rows: [] };
      }
      if (sql.includes('SELECT kds_config')) {
        return { rows: [{ kds_config: {} }] };
      }
      return { rows: [] };
    });

    const result = await syncNormalisedMenuCatalog(
      client as never,
      'cafe-1',
      catalog([
        item({
          name: 'Latte Large',
          priceMinor: 400,
          imageUrl: 'https://square-cdn.example/latte.jpg',
        }),
      ]),
    );

    expect(result.upsertedItems).toBe(1);
    const update = calls.find(
      (c) => c.sql.includes('UPDATE menu_items SET') && c.sql.includes('image_url'),
    );
    expect(update?.params).toEqual(
      expect.arrayContaining([
        'Latte Large',
        400,
        'https://square-cdn.example/latte.jpg',
        'pos',
        'mi-1',
        'cafe-1',
      ]),
    );

    // No archetype → Square groups only (empty here); prep NOT preserved.
    const { setMenuItemModifierGroups } = await import('./menu-modifier-library.js');
    expect(setMenuItemModifierGroups).toHaveBeenCalledWith(expect.anything(), 'mi-1', []);
  });

  it('preserves Moonshot prep attachments when archetype is set', async () => {
    const client = createClient((sql) => {
      if (sql.includes('drink_archetype_config') && sql.startsWith('SELECT')) {
        return { rows: [{ drink_archetype_config: {} }] };
      }
      if (sql.includes('FROM menu_items WHERE cafe_id') && sql.includes('pos_item_id')) {
        return { rows: [existingItemRow({ archetype: 'milk-forward-hot' })] };
      }
      if (sql.includes('MAX(sort_order)')) return { rows: [{ max: 0 }] };
      if (sql.includes('FROM menu_item_modifier_groups')) {
        return { rows: [{ modifier_group_id: 'prep-shots', pos_group_id: null }] };
      }
      if (sql.includes('FROM menu_sections') && sql.includes('kind =')) return { rows: [] };
      if (sql.includes('SELECT kds_config')) return { rows: [{ kds_config: {} }] };
      return { rows: [] };
    });

    await syncNormalisedMenuCatalog(client as never, 'cafe-1', catalog([item()]));

    const { setMenuItemModifierGroups } = await import('./menu-modifier-library.js');
    expect(setMenuItemModifierGroups).toHaveBeenCalledWith(
      expect.anything(),
      'mi-1',
      expect.arrayContaining(['prep-shots']),
    );
  });

  it('applies template image when Square has no image and name matches', async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const client = createClient((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('drink_archetype_config') && sql.startsWith('SELECT')) {
        return { rows: [{ drink_archetype_config: {} }] };
      }
      if (sql.includes('FROM menu_items WHERE cafe_id') && sql.includes('pos_item_id')) {
        return { rows: [existingItemRow()] };
      }
      if (sql.includes('MAX(sort_order)')) return { rows: [{ max: 0 }] };
      if (sql.includes('FROM menu_sections') && sql.includes('kind =')) return { rows: [] };
      if (sql.includes('SELECT kds_config')) return { rows: [{ kds_config: {} }] };
      return { rows: [] };
    });

    await syncNormalisedMenuCatalog(client as never, 'cafe-1', catalog([item()]));

    const update = calls.find(
      (c) => c.sql.includes('UPDATE menu_items SET') && c.sql.includes('image_source'),
    );
    expect(update?.params).toEqual(
      expect.arrayContaining([
        'https://api.example.com/api/v1/media/template/drinks/latte.webp',
        'template',
      ]),
    );
  });

  it('leaves upload image unchanged when Square has no image', async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const client = createClient((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('drink_archetype_config') && sql.startsWith('SELECT')) {
        return { rows: [{ drink_archetype_config: {} }] };
      }
      if (sql.includes('FROM menu_items WHERE cafe_id') && sql.includes('pos_item_id')) {
        return {
          rows: [
            existingItemRow({
              image_url: 'https://api.example.com/cafes/c1/x.webp',
              image_source: 'upload',
            }),
          ],
        };
      }
      if (sql.includes('MAX(sort_order)')) return { rows: [{ max: 0 }] };
      if (sql.includes('FROM menu_sections') && sql.includes('kind =')) return { rows: [] };
      if (sql.includes('SELECT kds_config')) return { rows: [{ kds_config: {} }] };
      return { rows: [] };
    });

    await syncNormalisedMenuCatalog(client as never, 'cafe-1', catalog([item()]));

    const update = calls.find((c) => c.sql.includes('UPDATE menu_items SET'));
    expect(update?.sql).not.toContain('image_url');
  });

  it('soft-deletes items listed in deletedPosItemIds', async () => {
    const client = createClient((sql) => {
      if (sql.includes('drink_archetype_config') && sql.startsWith('SELECT')) {
        return { rows: [{ drink_archetype_config: {} }] };
      }
      if (sql.includes('MAX(sort_order)')) return { rows: [{ max: 0 }] };
      if (sql.includes('is_available = FALSE')) {
        return { rows: [], rowCount: 2 };
      }
      if (sql.includes('FROM menu_sections') && sql.includes('kind =')) return { rows: [] };
      if (sql.includes('SELECT kds_config')) return { rows: [{ kds_config: {} }] };
      return { rows: [] };
    });

    const result = await syncNormalisedMenuCatalog(
      client as never,
      'cafe-1',
      catalog([], ['ITEM_GONE', 'ITEM_OLD']),
    );

    expect(result.softDeletedItems).toBe(2);
    expect(client.query).toHaveBeenCalledWith(
      expect.stringContaining('is_available = FALSE'),
      ['cafe-1', ['ITEM_GONE', 'ITEM_OLD']],
    );
  });
});
