import { describe, expect, it } from 'vitest';
import {
  buildMenuTemplateSavePayload,
  countEnabledDrinks,
  countEnabledMilks,
  createInitialMenuTemplateState,
} from './menu-template.js';

describe('guided menu template state', () => {
  it('starts with hot drinks and milks enabled', () => {
    const categories = createInitialMenuTemplateState();
    const hot = categories.find((c) => c.key === 'hot_drinks');
    const milks = categories.find((c) => c.key === 'milks');
    const food = categories.find((c) => c.key === 'food');
    expect(hot?.enabled).toBe(true);
    expect(hot?.disableToggle).toBe(true);
    expect(milks?.enabled).toBe(true);
    expect(food?.enabled).toBe(false);
    expect(countEnabledDrinks(categories)).toBeGreaterThan(0);
    expect(countEnabledMilks(categories)).toBeGreaterThan(0);
  });

  it('builds a save payload with trimmed names and category-gated enabled flags', () => {
    const categories = createInitialMenuTemplateState().map((cat) =>
      cat.key === 'syrups' ? { ...cat, enabled: false } : cat,
    );
    const payload = buildMenuTemplateSavePayload(categories);
    const syrups = payload.categories.find((c) => c.key === 'syrups');
    expect(syrups?.enabled).toBe(false);
    expect(syrups?.modifiers?.every((m) => m.enabled === false)).toBe(true);

    const hot = payload.categories.find((c) => c.key === 'hot_drinks');
    expect(hot?.enabled).toBe(true);
    expect((hot?.drinks ?? []).some((d) => d.enabled)).toBe(true);
  });
});
