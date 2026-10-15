import { describe, expect, it } from 'vitest';
import { ExtractedMenuSchema } from './schema.js';

describe('ExtractedMenuSchema', () => {
  it('accepts a minimal menu (sections + items only)', () => {
    const result = ExtractedMenuSchema.safeParse({
      sections: [{ name: 'Coffee', kind: 'drinks' }],
      items: [{ name: 'Flat white', section: 'Coffee', price: '3.50' }],
    });
    expect(result.success).toBe(true);
  });

  it('accepts item variants and section-level modifiers', () => {
    const result = ExtractedMenuSchema.safeParse({
      cafeName: 'Clay & Bean',
      sections: [
        {
          name: 'Coffee',
          kind: 'drinks',
          modifiers: [
            {
              name: 'Syrups',
              appliesTo: 'section',
              options: [
                { name: 'vanilla', priceDelta: '+0.60' },
                { name: 'caramel', priceDelta: '0.60' },
              ],
            },
          ],
        },
      ],
      items: [
        {
          name: 'Latte',
          section: 'Coffee',
          variants: [
            { label: 'regular', price: '3.50' },
            { label: 'large', price: '4.00' },
          ],
          dietaryCodes: ['vg'],
          confidence: 0.9,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it('rejects a modifier group with an unknown appliesTo scope', () => {
    const result = ExtractedMenuSchema.safeParse({
      sections: [],
      items: [],
      menuLevelModifiers: [
        {
          name: 'Add-ons',
          appliesTo: 'everything',
          options: [{ name: 'egg', priceDelta: '1.00' }],
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('rejects an item with an empty name', () => {
    const result = ExtractedMenuSchema.safeParse({
      sections: [],
      items: [{ name: '', price: '3.50' }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects a confidence value outside 0..1', () => {
    const result = ExtractedMenuSchema.safeParse({
      sections: [],
      items: [{ name: 'Flat white', price: '3.50', confidence: 1.5 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level keys (strict schema)', () => {
    const result = ExtractedMenuSchema.safeParse({
      sections: [],
      items: [],
      somethingElse: 'nope',
    });
    expect(result.success).toBe(false);
  });
});
