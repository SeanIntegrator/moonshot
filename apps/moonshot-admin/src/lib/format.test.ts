import { describe, expect, it } from 'vitest';
import { formatGbpMinor } from './format.js';

describe('formatGbpMinor', () => {
  it('formats pence as GBP currency', () => {
    expect(formatGbpMinor(350)).toBe('£3.50');
  });

  it('formats zero', () => {
    expect(formatGbpMinor(0)).toBe('£0.00');
  });
});
