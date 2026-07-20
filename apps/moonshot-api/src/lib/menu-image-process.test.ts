import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import {
  MENU_IMAGE_THUMBNAIL_HEIGHT,
  MENU_IMAGE_THUMBNAIL_WIDTH,
} from '@moonshot/types';
import {
  buildMenuThumbnailWebp,
  detectMenuImageMime,
  MenuImageValidationError,
} from './menu-image-process.js';

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

  it('letterboxes square sources into the frame without cropping height', async () => {
    // Distinct top/bottom colours — cover-crop would discard one of them.
    const png = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite([
        {
          input: await sharp({
            create: { width: 100, height: 20, channels: 3, background: { r: 255, g: 0, b: 0 } },
          })
            .png()
            .toBuffer(),
          top: 0,
          left: 0,
        },
        {
          input: await sharp({
            create: { width: 100, height: 20, channels: 3, background: { r: 0, g: 0, b: 255 } },
          })
            .png()
            .toBuffer(),
          top: 80,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    const webp = await buildMenuThumbnailWebp(png);
    const meta = await sharp(webp).metadata();
    expect(meta.width).toBe(MENU_IMAGE_THUMBNAIL_WIDTH);
    expect(meta.height).toBe(MENU_IMAGE_THUMBNAIL_HEIGHT);

    const { data, info } = await sharp(webp).raw().toBuffer({ resolveWithObject: true });
    const midX = Math.floor(info.width / 2);
    const topBand = sampleRgb(data, info, midX, 4);
    const bottomBand = sampleRgb(data, info, midX, info.height - 5);
    // Top red and bottom blue bands must both survive (contain, not cover).
    expect(topBand[0]).toBeGreaterThan(200);
    expect(topBand[2]).toBeLessThan(80);
    expect(bottomBand[2]).toBeGreaterThan(200);
    expect(bottomBand[0]).toBeLessThan(80);
  });
});

function sampleRgb(
  data: Buffer,
  info: { width: number; channels: number },
  x: number,
  y: number,
): [number, number, number] {
  const i = (y * info.width + x) * info.channels;
  return [data[i]!, data[i + 1]!, data[i + 2]!];
}
