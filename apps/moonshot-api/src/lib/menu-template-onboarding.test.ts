import {
  MENU_TEMPLATE_CATEGORIES,
  MENU_TEMPLATE_DEFAULT_DRINK_PRICE_MINOR,
  type AdminSaveMenuTemplateRequest,
} from '@moonshot/types';
import { describe, expect, it } from 'vitest';
import { applyMenuTemplate, MenuTemplateError } from './menu-template-onboarding.js';

function defaultPayload(): AdminSaveMenuTemplateRequest {
  return {
    categories: MENU_TEMPLATE_CATEGORIES.map((cat) => {
      if (cat.kind === 'drinks') {
        return {
          key: cat.key,
          enabled: cat.key === 'hot_drinks' || cat.key === 'cold_drinks',
          drinks: (cat.drinks ?? []).map((d) => ({
            templateKey: d.key,
            name: d.name,
            description: d.defaultDescription,
            priceMinor: MENU_TEMPLATE_DEFAULT_DRINK_PRICE_MINOR,
            category: d.category,
            enabled: d.defaultSelected,
          })),
        };
      }
      return {
        key: cat.key,
        enabled: true,
        modifiers: (cat.modifiers ?? []).map((m) => ({
          templateKey: m.key,
          name: m.name,
          priceMinor: m.defaultPriceMinor,
          enabled: m.defaultSelected,
          isDefault: m.isDefault === true,
        })),
      };
    }),
  };
}

describe('menu-template-onboarding validation', () => {
  it('rejects when hot_drinks category is disabled', async () => {
    const payload = defaultPayload();
    const hot = payload.categories.find((c) => c.key === 'hot_drinks')!;
    hot.enabled = false;

    const client = { query: async () => ({ rows: [] }) } as never;

    await expect(applyMenuTemplate(client, 'cafe-id', payload)).rejects.toMatchObject({
      message: 'hot_drinks cannot be disabled',
      status: 400,
    });
  });

  it('rejects when milks category is disabled', async () => {
    const payload = defaultPayload();
    const milks = payload.categories.find((c) => c.key === 'milks')!;
    milks.enabled = false;

    const client = { query: async () => ({ rows: [] }) } as never;

    await expect(applyMenuTemplate(client, 'cafe-id', payload)).rejects.toMatchObject({
      message: 'milks cannot be disabled',
      status: 400,
    });
  });

  it('rejects when cafe already has menu items', async () => {
    const payload = defaultPayload();
    const client = {
      query: async () => ({ rows: [{ id: 'existing' }] }),
    } as never;

    await expect(applyMenuTemplate(client, 'cafe-id', payload)).rejects.toBeInstanceOf(
      MenuTemplateError,
    );
  });
});
