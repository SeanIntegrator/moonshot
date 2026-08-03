import { describe, expect, it } from 'vitest';
import { resolveMenuTemplateDrinkKeyByExactName } from '@moonshot/types';
import { resolvePosCatalogItemImage } from './menu-item-default-image.js';

describe('resolveMenuTemplateDrinkKeyByExactName', () => {
  it('matches exact display names case-insensitively with trim', () => {
    expect(resolveMenuTemplateDrinkKeyByExactName('Flat white')).toBe('flat-white');
    expect(resolveMenuTemplateDrinkKeyByExactName('  FLAT WHITE  ')).toBe('flat-white');
    expect(resolveMenuTemplateDrinkKeyByExactName('Latte')).toBe('latte');
  });

  it('rejects non-exact names (no aliases)', () => {
    expect(resolveMenuTemplateDrinkKeyByExactName('FW')).toBeNull();
    expect(resolveMenuTemplateDrinkKeyByExactName('Flatwhite')).toBeNull();
    expect(resolveMenuTemplateDrinkKeyByExactName('House latte')).toBeNull();
  });
});

describe('resolvePosCatalogItemImage', () => {
  const base = 'https://api.example.com/api/v1/media';

  it('uses POS image when supplied', () => {
    expect(
      resolvePosCatalogItemImage({
        posImageUrl: 'https://square-cdn.example/latte.jpg',
        itemName: 'Latte',
        existing: null,
        publicBaseUrl: base,
      }),
    ).toEqual({
      writeImage: true,
      imageUrl: 'https://square-cdn.example/latte.jpg',
      imageSource: 'pos',
    });
  });

  it('applies shared template when no POS image and name matches', () => {
    expect(
      resolvePosCatalogItemImage({
        posImageUrl: null,
        itemName: 'Latte',
        existing: null,
        publicBaseUrl: base,
      }),
    ).toEqual({
      writeImage: true,
      imageUrl: `${base}/template/drinks/latte.webp`,
      imageSource: 'template',
    });
  });

  it('respects useDefaultImage=false', () => {
    expect(
      resolvePosCatalogItemImage({
        posImageUrl: null,
        itemName: 'Latte',
        existing: {
          imageUrl: `${base}/template/drinks/latte.webp`,
          imageSource: 'template',
          useDefaultImage: false,
        },
        publicBaseUrl: base,
      }),
    ).toEqual({
      writeImage: true,
      imageUrl: null,
      imageSource: null,
    });
  });

  it('does not clobber café uploads when POS has no image', () => {
    expect(
      resolvePosCatalogItemImage({
        posImageUrl: null,
        itemName: 'Latte',
        existing: {
          imageUrl: `${base}/cafes/c1/menu-items/i1/abc.webp`,
          imageSource: 'upload',
          useDefaultImage: true,
        },
        publicBaseUrl: base,
      }),
    ).toEqual({
      writeImage: false,
      imageUrl: `${base}/cafes/c1/menu-items/i1/abc.webp`,
      imageSource: 'upload',
    });
  });

  it('clears stale POS photo then applies template when opted in', () => {
    expect(
      resolvePosCatalogItemImage({
        posImageUrl: null,
        itemName: 'Flat white',
        existing: {
          imageUrl: 'https://square-cdn.example/old.jpg',
          imageSource: 'pos',
          useDefaultImage: true,
        },
        publicBaseUrl: base,
      }),
    ).toEqual({
      writeImage: true,
      imageUrl: `${base}/template/drinks/flat-white.webp`,
      imageSource: 'template',
    });
  });

  it('leaves legacy untagged URLs alone when POS has no image', () => {
    expect(
      resolvePosCatalogItemImage({
        posImageUrl: null,
        itemName: 'Latte',
        existing: {
          imageUrl: 'https://square-cdn.example/legacy.jpg',
          imageSource: null,
          useDefaultImage: true,
        },
        publicBaseUrl: base,
      }),
    ).toEqual({
      writeImage: false,
      imageUrl: 'https://square-cdn.example/legacy.jpg',
      imageSource: null,
    });
  });
});
