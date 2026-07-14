import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import { menuTemplateDrinkImageUrl } from '@moonshot/types';
import {
  readMenuImageStorageConfig,
  resetMenuImageStorageCacheForTests,
  uploadMenuItemThumbnail,
} from './menu-image-storage.js';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: sendMock })),
  PutObjectCommand: vi.fn((input: unknown) => input),
  GetObjectCommand: vi.fn((input: unknown) => input),
}));

describe('menu-image-storage', () => {
  const env = {
    MENU_IMAGE_BUCKET: 'menu-images',
    MENU_IMAGE_ENDPOINT: 'https://storage.railway.app',
    MENU_IMAGE_REGION: 'auto',
    MENU_IMAGE_ACCESS_KEY_ID: 'key',
    MENU_IMAGE_SECRET_ACCESS_KEY: 'secret',
    MENU_IMAGE_PUBLIC_BASE_URL: 'https://cdn.example.com/menu',
  };

  beforeEach(() => {
    sendMock.mockReset();
    sendMock.mockResolvedValue({});
    for (const [k, v] of Object.entries(env)) {
      process.env[k] = v;
    }
    resetMenuImageStorageCacheForTests();
  });

  afterEach(() => {
    for (const k of Object.keys(env)) {
      delete process.env[k];
    }
    resetMenuImageStorageCacheForTests();
  });

  it('reads storage config from env', () => {
    expect(readMenuImageStorageConfig()?.bucket).toBe('menu-images');
  });

  it('uploads a cafe menu item thumbnail and returns public URL', async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 120, g: 80, b: 40 } },
    })
      .png()
      .toBuffer();

    const url = await uploadMenuItemThumbnail({
      cafeId: 'cafe-1',
      itemId: 'item-1',
      fileBuffer: png,
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(url).toBe('https://cdn.example.com/menu/cafes/cafe-1/menu-items/item-1/thumbnail.webp');
  });
});

describe('menu-template image URLs', () => {
  it('builds stable template drink URLs', () => {
    expect(menuTemplateDrinkImageUrl('flat-white', 'https://cdn.example.com/menu')).toBe(
      'https://cdn.example.com/menu/template/drinks/flat-white.webp',
    );
  });
});
