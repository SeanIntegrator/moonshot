import { describe, expect, it } from 'vitest';
import type { DrinkArchetypeId } from '@moonshot/domain';
import {
  archetypeIdForOwnerTemplate,
  OWNER_RECIPE_TEMPLATES,
  ownerTemplateFromArchetype,
  ownerTemplateLabelForArchetype,
  type OwnerRecipeTemplateId,
} from './recipe-templates.js';

describe('OWNER_RECIPE_TEMPLATES', () => {
  it('has five owner options mapped to canonical archetypes', () => {
    expect(OWNER_RECIPE_TEMPLATES.map((t) => [t.id, t.archetypeId])).toEqual([
      ['hot-coffee', 'milk-forward-hot'],
      ['cold-coffee', 'milk-forward-iced'],
      ['hot-other', 'non-coffee-milk-hot'],
      ['cold-other', 'non-coffee-milk-iced'],
      ['empty', 'tea'],
    ]);
  });
});

describe('ownerTemplateFromArchetype', () => {
  const cases: Array<[DrinkArchetypeId | null | undefined, OwnerRecipeTemplateId]> = [
    ['milk-forward-hot', 'hot-coffee'],
    ['low-milk-hot', 'hot-coffee'],
    ['espresso-neat', 'hot-coffee'],
    ['milk-forward-iced', 'cold-coffee'],
    ['low-milk-iced', 'cold-coffee'],
    ['non-coffee-milk-hot', 'hot-other'],
    ['non-coffee-milk-iced', 'cold-other'],
    ['tea', 'empty'],
    [null, 'empty'],
    [undefined, 'empty'],
  ];

  it.each(cases)('maps %s → %s', (archetype, expected) => {
    expect(ownerTemplateFromArchetype(archetype)).toBe(expected);
  });
});

describe('archetypeIdForOwnerTemplate', () => {
  it('returns the canonical archetype for each owner template', () => {
    for (const t of OWNER_RECIPE_TEMPLATES) {
      expect(archetypeIdForOwnerTemplate(t.id)).toBe(t.archetypeId);
    }
  });
});

describe('ownerTemplateLabelForArchetype', () => {
  it('returns null when archetype is unset', () => {
    expect(ownerTemplateLabelForArchetype(null)).toBeNull();
    expect(ownerTemplateLabelForArchetype(undefined)).toBeNull();
  });

  it('returns the owner-facing label for stored archetypes', () => {
    expect(ownerTemplateLabelForArchetype('milk-forward-hot')).toBe('Hot coffee');
    expect(ownerTemplateLabelForArchetype('low-milk-hot')).toBe('Hot coffee');
    expect(ownerTemplateLabelForArchetype('tea')).toBe('Empty');
  });
});
