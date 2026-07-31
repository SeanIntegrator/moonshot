import { describe, expect, it, vi } from 'vitest';
import type { NormalisedWebhookEvent } from '@moonshot/types';

const { emitKdsServerToClient, fetchOrderWithItems } = vi.hoisted(() => ({
  emitKdsServerToClient: vi.fn(),
  fetchOrderWithItems: vi.fn(),
}));

vi.mock('../../realtime/kds-events.js', () => ({
  emitKdsServerToClient,
}));

vi.mock('./order-read.js', () => ({
  fetchOrderWithItems,
}));

vi.mock('../../db.js', () => ({
  pool: {
    connect: vi.fn(),
    query: vi.fn(),
  },
}));

import { persistPosOrderEvent } from './pos-order-ingress.js';

function openEvent(
  overrides: Partial<Extract<NormalisedWebhookEvent, { kind: 'order_open_or_updated' }>> = {},
): NormalisedWebhookEvent {
  return {
    kind: 'order_open_or_updated',
    cafeId: 'cafe-1',
    posOrderId: 'sq-ord-1',
    snapshot: {
      customerName: 'Alex',
      totalMinor: 400,
      currency: 'GBP',
      orderType: 'takeaway',
      paymentStatus: 'paid',
      items: [
        {
          id: 'li1',
          menuItemId: null,
          itemName: 'Flat White',
          quantity: 1,
          unitPriceMinor: 400,
          modifiers: [],
          allergens: [],
          notes: null,
        },
      ],
    },
    ...overrides,
  };
}

describe('persistPosOrderEvent', () => {
  it('creates then updates without duplicating on same pos_order_id', async () => {
    const orderRow = {
      id: 'ord-uuid-1',
      cafe_id: 'cafe-1',
      user_id: null,
      pos_order_id: 'sq-ord-1',
      customer_name: 'Alex',
      notes: null,
      total_minor: 400,
      currency: 'GBP',
      order_type: 'takeaway',
      source: 'pos',
      status: 'confirmed',
      payment_status: 'paid',
      quoted_pickup_time: null,
      pickup_time: null,
      completed_at: null,
      edit_token: null,
      parent_order_id: null,
      stripe_checkout_session_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const normalised = {
      id: 'ord-uuid-1',
      cafeId: 'cafe-1',
      source: 'pos' as const,
      customerName: 'Alex',
      customerId: null,
      items: [],
      notes: null,
      orderType: 'takeaway' as const,
      status: 'confirmed' as const,
      paymentStatus: 'paid' as const,
      totalMinor: 400,
      currency: 'GBP',
      pickup: {
        quotedPickupTime: null,
        pickupTime: null,
        completedAt: null,
        etaMode: 'auto' as const,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      posOrderId: 'sq-ord-1',
      editToken: null,
      parentOrderId: null,
    };

    let stored: typeof orderRow | null = null;
    const client = {
      query: vi.fn(async (sql: string, params?: unknown[]) => {
        if (sql.includes('BEGIN') || sql.includes('COMMIT') || sql.includes('ROLLBACK')) {
          return { rows: [] };
        }
        if (sql.includes('FROM orders') && sql.includes('pos_order_id')) {
          return { rows: stored ? [stored] : [] };
        }
        if (sql.startsWith('INSERT INTO orders')) {
          stored = { ...orderRow };
          return { rows: [stored] };
        }
        if (sql.startsWith('UPDATE orders')) {
          stored = {
            ...stored!,
            customer_name: String(params?.[0] ?? stored!.customer_name),
            total_minor: Number(params?.[2] ?? stored!.total_minor),
          };
          return { rows: [stored] };
        }
        if (sql.includes('DELETE FROM order_items') || sql.includes('INSERT INTO order_items')) {
          return { rows: [] };
        }
        return { rows: [] };
      }),
      release: vi.fn(),
    };

    const db = {
      connect: vi.fn(async () => client),
      query: vi.fn(async (sql: string, params?: unknown[]) => client.query(sql, params)),
    };

    fetchOrderWithItems.mockResolvedValue(normalised);

    const created = await persistPosOrderEvent(openEvent(), db as never);
    expect(created.kind).toBe('created');
    expect(emitKdsServerToClient).toHaveBeenCalledWith(
      'cafe-1',
      expect.objectContaining({ type: 'kds:order:new' }),
    );

    emitKdsServerToClient.mockClear();
    const base = openEvent();
    const updated = await persistPosOrderEvent(
      openEvent({
        snapshot: {
          ...base.snapshot,
          customerName: 'Alex 2',
          totalMinor: 450,
          items: base.snapshot?.items,
        },
      }),
      db as never,
    );
    expect(updated.kind).toBe('updated');
    expect(emitKdsServerToClient).toHaveBeenCalledWith(
      'cafe-1',
      expect.objectContaining({ type: 'kds:order:updated' }),
    );
    expect(stored?.pos_order_id).toBe('sq-ord-1');
    expect(
      client.query.mock.calls.filter((c) => String(c[0]).startsWith('INSERT INTO orders')),
    ).toHaveLength(1);
  });
});
