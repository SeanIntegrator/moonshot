import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { CafeTheme, CafeThemeColors } from '@moonshot/types';
import { boldTheme } from './bold.js';
import { botanicalTheme } from './botanical.js';
import { classicTheme } from './classic.js';
import { heritageTheme } from './heritage.js';
import { getTheme } from './index.js';
import { minimalTheme } from './minimal.js';
import { radiiFromCardStyle } from '../theme/radii.js';

const COLOR_KEYS: (keyof CafeThemeColors)[] = [
  'primary',
  'primaryContrast',
  'secondary',
  'background',
  'surface',
  'surfaceElevated',
  'text',
  'textMuted',
  'textOnDark',
  'border',
  'success',
  'warning',
  'error',
  'heroBg',
  'heroText',
];

const packs: CafeTheme[] = [
  heritageTheme,
  botanicalTheme,
  minimalTheme,
  boldTheme,
  classicTheme,
];

describe('theme pack contract', () => {
  for (const pack of packs) {
    it(`${pack.id} defines every colour / typography / layout token`, () => {
      for (const key of COLOR_KEYS) {
        expect(pack.colors[key], `colors.${key}`).toMatch(/^#[0-9a-fA-F]{3,8}$/);
      }
      expect(pack.typography.headingFamily.length).toBeGreaterThan(0);
      expect(pack.typography.bodyFamily.length).toBeGreaterThan(0);
      expect(pack.typography.headingWeight).toBeGreaterThan(0);
      expect(pack.typography.bodyWeight).toBeGreaterThan(0);
      expect(pack.typography.webfontUrls?.length ?? 0).toBeGreaterThan(0);
      expect(['2col', '3col', 'list']).toContain(pack.layout.menuGrid);
      expect(['rounded', 'sharp', 'pill']).toContain(pack.layout.cardStyle);
      expect(['full', 'compact', 'none']).toContain(pack.layout.heroStyle);
      expect(['bottom_bar', 'top_bar']).toContain(pack.layout.navStyle);
    });
  }

  it('getTheme falls back to heritage for unknown ids', () => {
    // @ts-expect-error intentional invalid id
    const t = getTheme('not-a-theme');
    expect(t.colors.primary).toBe(heritageTheme.colors.primary);
  });

  it('pill cardStyle keeps card radius finite (not fully round)', () => {
    const radii = radiiFromCardStyle('pill');
    expect(radii.card).toBeLessThan(100);
    expect(radii.control).toBe(999);
    expect(radii.pill).toBe(999);
  });
});

describe('no brand hex outside theme packs', () => {
  const srcRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  const hexRe = /#[0-9a-fA-F]{3,8}\b/g;
  const allowedRel = new Set([
    'themes/heritage.ts',
    'themes/botanical.ts',
    'themes/minimal.ts',
    'themes/bold.ts',
    'themes/classic.ts',
    'themes/theme-contract.test.ts',
  ]);

  function walk(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, name.name);
      if (name.isDirectory()) {
        if (name.name === 'node_modules' || name.name === 'dist') continue;
        walk(p, out);
      } else if (/\.(ts|tsx)$/.test(name.name) && !name.name.endsWith('.d.ts')) {
        out.push(p);
      }
    }
    return out;
  }

  it('components and structural theme contain no hex colour literals', () => {
    const offenders: string[] = [];
    for (const file of walk(srcRoot)) {
      const rel = file.slice(srcRoot.length + 1).replace(/\\/g, '/');
      if (allowedRel.has(rel)) continue;
      // Menu data colourHex usage is data-driven, not brand — still no literal hex in source.
      const text = readFileSync(file, 'utf8');
      const matches = text.match(hexRe);
      if (matches?.length) {
        offenders.push(`${rel}: ${matches.join(', ')}`);
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});
