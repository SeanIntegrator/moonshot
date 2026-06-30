import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { buildMenuThumbnailWebp, detectMenuImageMime, MenuImageValidationError } from './menu-image-process.js';

describe('menu-image-process', () => {
  it('rejects non-image bytes', async () => {
    await expect(detectMenuImageMime(Buffer.from('not an image'))).rejects.toBeInstanceOf(
      MenuImageValidationError,
    );
  });

  it('accepts a PNG and produces a small WebP thumbnail', async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: { r: 200, g: 100, b: 50 } },
    })
      .png()
      .toBuffer();

    const mime = await detectMenuImageMime(png);
    expect(mime).toBe('image/png');

    const webp = await buildMenuThumbnailWebp(png);
    expect(webp.length).toBeGreaterThan(0);
    expect(webp.subarray(0, 4).toString('ascii')).toBe('RIFF');
  });
});
