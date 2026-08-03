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

describe('syncNormalisedMenuCatalog', () => {
  it('updates price/name and Square image on existing pos-linked item', async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const client = createClient((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('drink_archetype_config') && sql.startsWith('SELECT')) {
        return { rows: [{ drink_archetype_config: {} }] };
      }
      if (sql.includes('SELECT id, archetype FROM menu_items')) {
        return { rows: [{ id: 'mi-1', archetype: null }] };
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
      if (sql.includes('SELECT id, archetype FROM menu_items')) {
        return { rows: [{ id: 'mi-1', archetype: 'milk-forward-hot' }] };
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

  it('leaves image_url unchanged when Square has no image', async () => {
    const calls: { sql: string; params?: unknown[] }[] = [];
    const client = createClient((sql, params) => {
      calls.push({ sql, params });
      if (sql.includes('drink_archetype_config') && sql.startsWith('SELECT')) {
        return { rows: [{ drink_archetype_config: {} }] };
      }
      if (sql.includes('SELECT id, archetype FROM menu_items')) {
        return { rows: [{ id: 'mi-1', archetype: null }] };
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
