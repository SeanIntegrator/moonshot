import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import sharp from 'sharp';
import {
  cafeMenuItemImageKey,
  menuImageObjectKeyFromPublicUrl,
  menuTemplateDrinkImageUrl,
} from '@moonshot/types';
import {
  copyTemplateDrinkImageToCafeItem,
  readMenuImageStorageConfig,
  resetMenuImageStorageCacheForTests,
  uploadMenuItemThumbnail,
  uploadRawWebpObject,
} from './menu-image-storage.js';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(() => ({ send: sendMock })),
  PutObjectCommand: vi.fn((input: unknown) => input),
  GetObjectCommand: vi.fn((input: unknown) => input),
  DeleteObjectCommand: vi.fn((input: unknown) => input),
  CopyObjectCommand: vi.fn((input: unknown) => input),
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

  it('uploads a versioned cafe menu item thumbnail and returns public URL', async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 120, g: 80, b: 40 } },
    })
      .png()
      .toBuffer();

    const url = await uploadMenuItemThumbnail({
      cafeId: '11111111-1111-1111-1111-111111111111',
      itemId: '22222222-2222-2222-2222-222222222222',
      fileBuffer: png,
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(url).toMatch(
      /^https:\/\/cdn\.example\.com\/menu\/cafes\/11111111-1111-1111-1111-111111111111\/menu-items\/22222222-2222-2222-2222-222222222222\/[a-z0-9]+\.webp$/,
    );
    expect(url).not.toContain('/thumbnail.webp');
  });

  it('deletes the previous cafe object after a successful replace', async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 120, g: 80, b: 40 } },
    })
      .png()
      .toBuffer();

    const previousKey =
      'cafes/11111111-1111-1111-1111-111111111111/menu-items/22222222-2222-2222-2222-222222222222/oldver.webp';
    const previousUrl = `https://cdn.example.com/menu/${previousKey}`;

    await uploadMenuItemThumbnail({
      cafeId: '11111111-1111-1111-1111-111111111111',
      itemId: '22222222-2222-2222-2222-222222222222',
      fileBuffer: png,
      previousImageUrl: previousUrl,
    });

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[1]![0]).toMatchObject({
      Bucket: 'menu-images',
      Key: previousKey,
    });
  });

  it('does not delete previous template URLs on replace', async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 10, g: 20, b: 30 } },
    })
      .png()
      .toBuffer();

    await uploadMenuItemThumbnail({
      cafeId: '11111111-1111-1111-1111-111111111111',
      itemId: '22222222-2222-2222-2222-222222222222',
      fileBuffer: png,
      previousImageUrl: 'https://cdn.example.com/menu/template/drinks/flat-white.webp',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
  });

  it('copies a template drink into cafe-scoped storage', async () => {
    const url = await copyTemplateDrinkImageToCafeItem({
      cafeId: '11111111-1111-1111-1111-111111111111',
      itemId: '22222222-2222-2222-2222-222222222222',
      templateKey: 'flat-white',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0]![0]).toMatchObject({
      Bucket: 'menu-images',
      CopySource: 'menu-images/template/drinks/flat-white.webp',
      Key: expect.stringMatching(
        /^cafes\/11111111-1111-1111-1111-111111111111\/menu-items\/22222222-2222-2222-2222-222222222222\/[a-z0-9]+\.webp$/,
      ),
    });
    expect(url).toMatch(
      /^https:\/\/cdn\.example\.com\/menu\/cafes\/11111111-1111-1111-1111-111111111111\/menu-items\/22222222-2222-2222-2222-222222222222\/[a-z0-9]+\.webp$/,
    );
  });

  it('returns null when the template object is missing', async () => {
    sendMock.mockRejectedValueOnce(Object.assign(new Error('missing'), { name: 'NoSuchKey' }));

    const url = await copyTemplateDrinkImageToCafeItem({
      cafeId: '11111111-1111-1111-1111-111111111111',
      itemId: '22222222-2222-2222-2222-222222222222',
      templateKey: 'latte',
    });

    expect(url).toBeNull();
  });

  it('rejects raw uploads outside template/', async () => {
    await expect(
      uploadRawWebpObject({
        objectKey: 'cafes/11111111-1111-1111-1111-111111111111/menu-items/22222222-2222-2222-2222-222222222222/x.webp',
        body: Buffer.from('webp'),
      }),
    ).rejects.toMatchObject({
      message: 'Raw WebP uploads are reserved for template/ object keys',
    });
    expect(sendMock).not.toHaveBeenCalled();
  });
});

describe('menu-template image URLs', () => {
  it('builds stable template drink URLs', () => {
    expect(menuTemplateDrinkImageUrl('flat-white', 'https://cdn.example.com/menu')).toBe(
      'https://cdn.example.com/menu/template/drinks/flat-white.webp',
    );
  });

  it('builds versioned cafe keys and extracts keys from public URLs', () => {
    const key = cafeMenuItemImageKey(
      '11111111-1111-1111-1111-111111111111',
      '22222222-2222-2222-2222-222222222222',
      'm1abc2',
    );
    expect(key).toBe(
      'cafes/11111111-1111-1111-1111-111111111111/menu-items/22222222-2222-2222-2222-222222222222/m1abc2.webp',
    );
    expect(
      menuImageObjectKeyFromPublicUrl(`https://cdn.example.com/menu/${key}`, 'https://cdn.example.com/menu'),
    ).toBe(key);
  });
});
