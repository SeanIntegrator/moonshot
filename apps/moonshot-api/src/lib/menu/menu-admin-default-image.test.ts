import { describe, expect, it, vi } from 'vitest';
import type { Pool } from 'pg';
import { ApiHttpError } from '../http-errors.js';
import { setMenuItemUseDefaultImage, uploadMenuItemImage } from './menu-admin-service.js';

vi.mock('./menu-fetch.js', () => ({
  fetchMenuItemsByIds: vi.fn(async (_db: Pool, _cafeId: string, ids: string[]) => {
    const map = new Map();
    for (const id of ids) {
      map.set(id, {
        id,
        posItemId: 'ITEM_1',
        name: 'Latte',
        description: null,
        priceMinor: 350,
        currency: 'GBP',
        category: 'hot_drinks',
        subcategory: null,
        imageUrl: 'https://api.example.com/api/v1/media/template/drinks/latte.webp',
        imageSource: 'template',
        useDefaultImage: true,
        emoji: null,
        isAvailable: true,
        sizes: [],
        modifierGroups: [],
        tags: [],
        archetype: null,
        waiveMilkSurcharge: false,
        allowNoMilk: false,
      });
    }
    return map;
  }),
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
  uploadMenuItemThumbnail: vi.fn(),
  MenuImageValidationError: class extends Error {},
}));

function createDb(handler: (sql: string, params?: unknown[]) => { rows: unknown[] }) {
  return {
    query: vi.fn(async (sql: string, params?: unknown[]) => handler(sql, params)),
  } as unknown as Pool;
}

describe('setMenuItemUseDefaultImage', () => {
  it('applies template URL when turning on', async () => {
    const db = createDb((sql) => {
      if (sql.includes('SELECT name, image_source')) {
        return { rows: [{ name: 'Latte', image_source: null, pos_item_id: 'ITEM_1' }] };
      }
      return { rows: [] };
    });

    const item = await setMenuItemUseDefaultImage(db, 'cafe-1', 'mi-1', true);
    expect(item.imageSource).toBe('template');
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("image_source = 'template'"),
      expect.arrayContaining([
        'https://api.example.com/api/v1/media/template/drinks/latte.webp',
        'mi-1',
        'cafe-1',
      ]),
    );
  });

  it('clears image when turning off', async () => {
    const db = createDb((sql) => {
      if (sql.includes('SELECT name, image_source')) {
        return {
          rows: [{ name: 'Latte', image_source: 'template', pos_item_id: 'ITEM_1' }],
        };
      }
      return { rows: [] };
    });

    await setMenuItemUseDefaultImage(db, 'cafe-1', 'mi-1', false);
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining('use_default_image = FALSE'),
      ['mi-1', 'cafe-1'],
    );
  });

  it('rejects when a custom photo is in place', async () => {
    const db = createDb(() => ({
      rows: [{ name: 'Latte', image_source: 'upload', pos_item_id: 'ITEM_1' }],
    }));

    await expect(setMenuItemUseDefaultImage(db, 'cafe-1', 'mi-1', true)).rejects.toBeInstanceOf(
      ApiHttpError,
    );
  });

  it('rejects turn-on when name has no template match', async () => {
    const db = createDb(() => ({
      rows: [{ name: 'House Special', image_source: null, pos_item_id: 'ITEM_1' }],
    }));

    await expect(setMenuItemUseDefaultImage(db, 'cafe-1', 'mi-1', true)).rejects.toMatchObject({
      status: 400,
    });
  });
});

describe('uploadMenuItemImage', () => {
  it('rejects POS-owned items', async () => {
    const db = createDb(() => ({
      rows: [{ image_url: 'https://square-cdn.example/latte.jpg', pos_item_id: 'ITEM_1' }],
    }));

    await expect(
      uploadMenuItemImage(db, 'cafe-1', 'mi-1', Buffer.from('fake')),
    ).rejects.toMatchObject({
      status: 400,
      message: 'Photos for this item come from Square',
    });
  });

  it('allows upload when the item is not POS-owned', async () => {
    const { uploadMenuItemThumbnail } = await import('./menu-image-storage.js');
    vi.mocked(uploadMenuItemThumbnail).mockResolvedValueOnce(
      'https://api.example.com/api/v1/media/cafes/cafe-1/menu-items/mi-1/v.webp',
    );
    const db = createDb((sql) => {
      if (sql.includes('SELECT image_url, pos_item_id')) {
        return { rows: [{ image_url: null, pos_item_id: null }] };
      }
      return { rows: [] };
    });

    await uploadMenuItemImage(db, 'cafe-1', 'mi-1', Buffer.from('fake'));
    expect(uploadMenuItemThumbnail).toHaveBeenCalled();
  });
});
