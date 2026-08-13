import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.hoisted(() => vi.fn());

vi.mock('./client.js', () => ({
  createSquareClient: () => ({ orders: { get } }),
}));

import { fetchSquareOrder } from './order-normalise.js';

const sleep = async (): Promise<void> => undefined;

describe('fetchSquareOrder retries', () => {
  beforeEach(() => {
    get.mockReset();
  });

  it('returns the order on a later attempt', async () => {
    get
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({ order: undefined })
      .mockResolvedValueOnce({ order: { id: 'sq-1' } });

    const order = await fetchSquareOrder({
      accessToken: 'tok',
      orderId: 'sq-1',
      sleep,
    });
    expect(order).toEqual({ id: 'sq-1' });
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('rethrows after three thrown failures', async () => {
    get.mockRejectedValue(new Error('down'));
    await expect(
      fetchSquareOrder({ accessToken: 'tok', orderId: 'sq-1', sleep }),
    ).rejects.toThrow('down');
    expect(get).toHaveBeenCalledTimes(3);
  });

  it('returns null when Square has no order after retries', async () => {
    get.mockResolvedValue({ order: undefined });
    await expect(
      fetchSquareOrder({ accessToken: 'tok', orderId: 'sq-1', sleep }),
    ).resolves.toBeNull();
    expect(get).toHaveBeenCalledTimes(3);
  });
});
