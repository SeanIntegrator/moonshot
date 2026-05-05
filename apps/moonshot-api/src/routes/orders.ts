import { Router } from 'express';
import type { CreateOrderLineInput, CreateOrderResponse, OrderType } from '@moonshot/types';
import { ApiErrorCode } from '@moonshot/types';
import { ApiHttpError } from '../lib/http-errors.js';
import { createGuestPayInStoreOrder } from '../lib/orders-repository.js';
import { emitKdsServerToClient } from '../realtime/kds-events.js';
import { requireCafeContext } from '../middleware/cafe-context.js';

const ORDER_TYPES: OrderType[] = ['takeaway', 'eat_in'];

export const ordersRouter: Router = Router();

ordersRouter.use(requireCafeContext);

ordersRouter.post('/', async (req, res) => {
  try {
    const cafeId = req.cafe!.cafeId;
    const body = req.body as Record<string, unknown>;

    const customerName = typeof body.customerName === 'string' ? body.customerName : '';
    const notes =
      typeof body.notes === 'string' ? body.notes : body.notes === null ? null : undefined;
    const orderType = body.orderType as OrderType;

    if (!ORDER_TYPES.includes(orderType)) {
      return res.status(400).json({
        ok: false,
        error: 'orderType must be takeaway or eat_in',
        code: ApiErrorCode.VALIDATION,
      });
    }

    const rawItems = body.items;
    if (!Array.isArray(rawItems)) {
      return res.status(400).json({
        ok: false,
        error: 'items must be an array',
        code: ApiErrorCode.VALIDATION,
      });
    }

    const items: CreateOrderLineInput[] = rawItems.map((raw) => {
      const row = raw as Record<string, unknown>;
      return {
        menuItemId: typeof row.menuItemId === 'string' ? row.menuItemId : '',
        quantity: typeof row.quantity === 'number' ? row.quantity : NaN,
        modifiers: Array.isArray(row.modifiers)
          ? (row.modifiers as CreateOrderLineInput['modifiers'])
          : undefined,
        notes:
          typeof row.notes === 'string'
            ? row.notes
            : row.notes === null
              ? null
              : undefined,
      };
    });

    const order = await createGuestPayInStoreOrder({
      cafeId,
      customerName,
      notes: notes ?? null,
      orderType,
      lines: items,
    });

    emitKdsServerToClient(cafeId, { type: 'kds:order:new', order });

    const data: CreateOrderResponse = { order };
    return res.status(201).json({ ok: true, data });
  } catch (e) {
    if (e instanceof ApiHttpError) {
      return res.status(e.status).json({
        ok: false,
        error: e.message,
        code: e.code,
      });
    }
    console.error(e);
    return res.status(500).json({
      ok: false,
      error: 'Database error',
      code: ApiErrorCode.INTERNAL,
    });
  }
});
