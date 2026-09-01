import { describe, expect, it } from 'vitest';
import { orderingUnavailableCopy } from './ordering-unavailable-copy.js';

describe('orderingUnavailableCopy', () => {
  it('uses the closed caption as the title', () => {
    expect(
      orderingUnavailableCopy({
        orderAheadEnabled: true,
        reason: 'closed',
        caption: 'Closed · opens 8:00 am',
      }),
    ).toEqual({
      title: 'Closed · opens 8:00 am',
      body: 'Online ordering will be back when the café is open.',
    });
  });

  it('treats last-order buffer like closed', () => {
    const copy = orderingUnavailableCopy({
      orderAheadEnabled: true,
      reason: 'buffer',
      caption: 'Closed · opens 8:00 am',
    });
    expect(copy.title).toBe('Closed · opens 8:00 am');
  });

  it('uses pause copy when the café is on a break', () => {
    expect(
      orderingUnavailableCopy({
        orderAheadEnabled: true,
        reason: 'paused',
        caption: 'Taking a short break — back at 3:10 pm',
      }),
    ).toEqual({
      title: 'Back shortly',
      body: 'Taking a short break — back at 3:10 pm',
    });
  });

  it('wins over hours when order-ahead is off', () => {
    expect(
      orderingUnavailableCopy({
        orderAheadEnabled: false,
        reason: 'closed',
        caption: 'Closed · opens 8:00 am',
      }).title,
    ).toBe('Online ordering unavailable');
  });
});
