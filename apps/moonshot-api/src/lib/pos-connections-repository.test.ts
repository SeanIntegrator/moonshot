import { describe, expect, it, vi } from 'vitest';
import { markNeedsReauth } from './pos-connections-repository.js';

describe('markNeedsReauth', () => {
  it('does not overwrite a revoked connection', async () => {
    const query = vi.fn().mockResolvedValue({ rowCount: 0 });
    await markNeedsReauth({ query } as never, 'cafe-1', 'square');

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("status <> 'revoked'"),
      ['cafe-1', 'square'],
    );
  });
});
