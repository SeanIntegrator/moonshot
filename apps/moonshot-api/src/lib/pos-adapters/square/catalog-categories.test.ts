import { describe, expect, it } from 'vitest';
import type { CatalogObject } from 'square';
import {
  buildCatalogSections,
  resolveItemCategoryPlacement,
  inferKindFromName,
} from './catalog-categories.js';

function category(
  id: string,
  name: string,
  opts?: { parentId?: string; ordinal?: number; isTopLevel?: boolean },
): CatalogObject.Category {
  return {
    type: 'CATEGORY',
    id,
    isDeleted: false,
    categoryData: {
      name,
      isTopLevel: opts?.isTopLevel ?? !opts?.parentId,
      parentCategory: opts?.parentId
        ? { id: opts.parentId, ordinal: opts.ordinal ?? 0 }
        : opts?.ordinal != null
          ? { ordinal: opts.ordinal }
          : undefined,
    },
  };
}

describe('catalog-categories', () => {
  it('builds a two-level parent/child tree ordered by ordinal', () => {
    const cats = [
      category('P_COFFEE', 'Coffee', { isTopLevel: true, ordinal: 1 }),
      category('C_HOT', 'Hot drinks', { parentId: 'P_COFFEE', ordinal: 0 }),
      category('C_ICED', 'Iced drinks', { parentId: 'P_COFFEE', ordinal: 1 }),
      category('P_FOOD', 'Pastries', { isTopLevel: true, ordinal: 0 }),
    ];
    const { sections, keyByPosCategoryId } = buildCatalogSections(cats);

    expect(keyByPosCategoryId.get('P_COFFEE')).toBe('coffee');
    expect(keyByPosCategoryId.get('C_HOT')).toBe('hot_drinks');
    expect(sections.find((s) => s.posCategoryId === 'C_HOT')?.parentKey).toBe('coffee');
    expect(sections.find((s) => s.posCategoryId === 'C_ICED')?.parentKey).toBe('coffee');
    expect(sections.find((s) => s.posCategoryId === 'P_FOOD')?.kind).toBe('food');
    expect(sections.find((s) => s.posCategoryId === 'P_COFFEE')?.parentKey).toBeNull();
  });

  it('keeps Moonshot keys stable when Square renames a category', () => {
    const existing = new Map([['CAT_1', 'legacy_coffee']]);
    const { sections } = buildCatalogSections(
      [category('CAT_1', 'Espresso Bar', { isTopLevel: true })],
      existing,
    );
    expect(sections[0]?.key).toBe('legacy_coffee');
    expect(sections[0]?.label).toBe('Espresso Bar');
  });

  it('infers food kind from name heuristics', () => {
    expect(inferKindFromName('Bakery')).toBe('food');
    expect(inferKindFromName('Sandwiches')).toBe('food');
    expect(inferKindFromName('Coffee')).toBe('drink');
  });

  it('prefers reportingCategory then categories[] then legacy categoryId', () => {
    const keyByPos = new Map([
      ['REP', 'reporting'],
      ['CAT_A', 'first'],
      ['LEGACY', 'legacy'],
    ]);
    expect(
      resolveItemCategoryPlacement(
        { reportingCategory: { id: 'REP' }, categories: [{ id: 'CAT_A' }], categoryId: 'LEGACY' },
        keyByPos,
      ),
    ).toEqual({ sectionKey: 'reporting', posCategoryId: 'REP' });

    expect(
      resolveItemCategoryPlacement(
        { categories: [{ id: 'CAT_A' }], categoryId: 'LEGACY' },
        keyByPos,
      ),
    ).toEqual({ sectionKey: 'first', posCategoryId: 'CAT_A' });

    expect(
      resolveItemCategoryPlacement({ categoryId: 'LEGACY' }, keyByPos),
    ).toEqual({ sectionKey: 'legacy', posCategoryId: 'LEGACY' });

    expect(resolveItemCategoryPlacement({}, keyByPos).sectionKey).toBe('uncategorised');
  });
});
