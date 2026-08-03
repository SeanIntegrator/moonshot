import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { resolveMenuTemplateDrinkSourcePath } from './menu-template-image-sources.js';

describe('resolveMenuTemplateDrinkSourcePath', () => {
  const dirs: string[] = [];

  afterEach(async () => {
    // temp dirs are left for the OS; no need to wipe for unit tests
    dirs.length = 0;
  });

  async function makeDir(): Promise<string> {
    const dir = await mkdtemp(path.join(os.tmpdir(), 'menu-template-src-'));
    dirs.push(dir);
    return dir;
  }

  it('returns missing when no source file exists', async () => {
    const dir = await makeDir();
    expect(await resolveMenuTemplateDrinkSourcePath(dir, 'flat-white')).toEqual({
      kind: 'missing',
    });
  });

  it('prefers webp over jpeg when both exist', async () => {
    const dir = await makeDir();
    await writeFile(path.join(dir, 'flat-white.webp'), Buffer.from('webp'));
    await writeFile(path.join(dir, 'flat-white.jpg'), Buffer.from('jpg'));

    const resolved = await resolveMenuTemplateDrinkSourcePath(dir, 'flat-white');
    expect(resolved).toEqual({
      kind: 'file',
      path: path.join(dir, 'flat-white.webp'),
      extension: '.webp',
    });
  });

  it('falls back to jpeg then png', async () => {
    const dir = await makeDir();
    const png = await sharp({
      create: { width: 4, height: 4, channels: 3, background: { r: 1, g: 2, b: 3 } },
    })
      .png()
      .toBuffer();
    await writeFile(path.join(dir, 'latte.png'), png);

    const resolved = await resolveMenuTemplateDrinkSourcePath(dir, 'latte');
    expect(resolved).toEqual({
      kind: 'file',
      path: path.join(dir, 'latte.png'),
      extension: '.png',
    });
  });

  it('resolves jpeg before png', async () => {
    const dir = await makeDir();
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, 'mocha.jpg'), Buffer.from('jpg'));
    await writeFile(path.join(dir, 'mocha.png'), Buffer.from('png'));

    const resolved = await resolveMenuTemplateDrinkSourcePath(dir, 'mocha');
    expect(resolved).toEqual({
      kind: 'file',
      path: path.join(dir, 'mocha.jpg'),
      extension: '.jpg',
    });
  });
});
