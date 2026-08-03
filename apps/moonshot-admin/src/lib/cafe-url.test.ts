import { describe, expect, it, vi } from 'vitest';
import { orderAheadHostPath, resolveAvailableSlug } from './cafe-url.js';

describe('resolveAvailableSlug', () => {
  it('returns the first available candidate', async () => {
    const check = vi.fn(async (slug: string) => ({
      available: slug !== 'clay-bean',
      slug,
    }));
    await expect(resolveAvailableSlug('Clay & Bean', check)).resolves.toBe('clay-bean-2');
    expect(check).toHaveBeenCalledWith('clay-bean');
    expect(check).toHaveBeenCalledWith('clay-bean-2');
  });

  it('returns the base slug when available', async () => {
    const check = vi.fn(async (slug: string) => ({ available: true, slug }));
    await expect(resolveAvailableSlug('Shed', check)).resolves.toBe('shed');
  });

  it('falls back to the base slug when the check throws', async () => {
    const check = vi.fn(async () => {
      throw new Error('offline');
    });
    await expect(resolveAvailableSlug('Shed', check)).resolves.toBe('shed');
  });
});

describe('orderAheadHostPath', () => {
  it('strips protocol and joins slug', () => {
    expect(orderAheadHostPath('https://order.moonshot.app/', 'shed')).toBe(
      'order.moonshot.app/shed',
    );
  });
});
