/**
 * Central fan-out after order lifecycle transitions (KDS sockets, customer
 * sockets, pickup ETA recompute, loyalty on complete).
 * Pattern mirrors `lib/menu/menu-sync-notify.ts`.
 */
import type { KdsConfig, NormalisedOrder } from '@moonshot/types';
import type { Pool } from 'pg';
import { findCafeById } from '../cafes-repository.js';
import { applyLoyaltyAfterKdsComplete } from '../loyalty-after-kds-complete.js';
import { recomputePickupEtasForCafe } from '../pickup-eta.js';
import { emitCustomerServerToClient } from '../../realtime/customer-events.js';
import { emitKdsServerToClient } from '../../realtime/kds-events.js';

export type OrderLifecycleDb = Pool;

/** New ticket on the KDS board (pay-in-store create, Stripe paid, recall). */
export function emitOrderNewOnKds(cafeId: string, order: NormalisedOrder): void {
  emitKdsServerToClient(cafeId, { type: 'kds:order:new', order });
}

export function emitOrderStatusToCustomer(
  cafeId: string,
  orderId: string,
  status: NormalisedOrder['status'],
): void {
  emitCustomerServerToClient(orderId, {
    type: 'customerOrderStatusUpdated',
    orderId,
    cafeId,
    status,
  });
}

export function emitOrderUpdatedOnKds(cafeId: string, order: NormalisedOrder): void {
  emitKdsServerToClient(cafeId, { type: 'kds:order:updated', order });
}

export function emitOrderRemovedFromKds(cafeId: string, orderId: string): void {
  emitKdsServerToClient(cafeId, { type: 'kds:order:removed', orderId });
}

/**
 * Recompute café pickup ETAs. When `swallowErrors` is true (KDS complete/recall),
 * failures are logged so kitchen UX is not blocked by ETA side-effects.
 */
export async function recomputePickupEtasAfterOrderChange(params: {
  db: OrderLifecycleDb;
  cafeId: string;
  kdsConfig?: KdsConfig;
  orderId?: string;
  swallowErrors?: boolean;
  logTag?: string;
}): Promise<void> {
  const {
    db,
    cafeId,
    orderId,
    swallowErrors = false,
    logTag = 'order-lifecycle',
  } = params;

  const run = async () => {
    const kdsConfig =
      params.kdsConfig ?? (await findCafeById(cafeId))?.kdsConfig ?? null;
    if (!kdsConfig) return;
    await recomputePickupEtasForCafe({ db, cafeId, kdsConfig });
  };

  if (!swallowErrors) {
    await run();
    return;
  }

  try {
    await run();
  } catch (e) {
    console.error(`[${logTag}] ETA recompute failure (swallowed)`, {
      cafeId,
      orderId,
      err: e,
    });
  }
}

/** Paid / pay-in-store order ready for kitchen: KDS new + ETA refresh. */
export async function notifyOrderReadyForKitchen(params: {
  db: OrderLifecycleDb;
  cafeId: string;
  order: NormalisedOrder;
  kdsConfig?: KdsConfig;
  swallowEtaErrors?: boolean;
  logTag?: string;
}): Promise<void> {
  emitOrderNewOnKds(params.cafeId, params.order);
  await recomputePickupEtasAfterOrderChange({
    db: params.db,
    cafeId: params.cafeId,
    kdsConfig: params.kdsConfig,
    orderId: params.order.id,
    swallowErrors: params.swallowEtaErrors ?? false,
    logTag: params.logTag,
  });
}

/**
 * After a successful recall: notify KDS + customer sockets and recompute ETAs.
 * ETA failures are swallowed so the kitchen still gets the reopened ticket.
 */
export async function notifyOrderRecalled(params: {
  db: OrderLifecycleDb;
  cafeId: string;
  order: NormalisedOrder;
  logTag: string;
}): Promise<void> {
  const { db, cafeId, order, logTag } = params;
  emitOrderNewOnKds(cafeId, order);
  emitOrderStatusToCustomer(cafeId, order.id, order.status);
  await recomputePickupEtasAfterOrderChange({
    db,
    cafeId,
    orderId: order.id,
    swallowErrors: true,
    logTag,
  });
}

/** Status advance on an open ticket (confirmed → preparing → ready). */
export function notifyOrderStatusAdvanced(params: {
  cafeId: string;
  order: NormalisedOrder;
}): void {
  emitOrderUpdatedOnKds(params.cafeId, params.order);
  emitOrderStatusToCustomer(params.cafeId, params.order.id, params.order.status);
}

/** Cancelled ticket: drop from KDS board and push status to the customer app. */
export function notifyOrderCancelled(params: {
  cafeId: string;
  order: NormalisedOrder;
}): void {
  emitOrderRemovedFromKds(params.cafeId, params.order.id);
  emitOrderStatusToCustomer(params.cafeId, params.order.id, 'cancelled');
}

/** Cap loyalty apply so a slow/locked ledger never delays the customer completion push. */
const LOYALTY_APPLY_BUDGET_MS = 2000;

async function raceWithBudget<T>(
  promise: Promise<T>,
  budgetMs: number,
): Promise<T | 'timeout'> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<'timeout'>((resolve) => {
        timer = setTimeout(() => resolve('timeout'), budgetMs);
      }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

/**
 * Post-complete side-effects must never fail the KDS request: the order row is
 * already `completed`. Log + swallow loyalty and ETA failures.
 *
 * Loyalty runs *before* `customerOrderCompleted` so the stamp payload rides the
 * same event (avoids a second emit racing socket teardown when the order drops
 * from the active list). A budget/failure still emits completion without `loyalty`.
 */
export async function notifyOrderCompleted(params: {
  db: OrderLifecycleDb;
  cafeId: string;
  order: NormalisedOrder;
}): Promise<void> {
  const { db, cafeId, order } = params;
  const orderId = order.id;

  emitOrderRemovedFromKds(cafeId, orderId);

  // Apply may still finish after a timeout (review nudge, ledger); swallow late errors.
  const applyPromise = applyLoyaltyAfterKdsComplete({ cafeId, order }).catch((e) => {
    console.error('[kds.complete] loyalty post-success failure (swallowed)', {
      cafeId,
      orderId,
      customerId: order.customerId,
      paymentStatus: order.paymentStatus,
      err: e,
    });
    return { applied: false as const };
  });

  const applyResult = await raceWithBudget(applyPromise, LOYALTY_APPLY_BUDGET_MS);
  if (applyResult === 'timeout') {
    console.error('[kds.complete] loyalty apply overran budget (swallowed)', {
      cafeId,
      orderId,
      budgetMs: LOYALTY_APPLY_BUDGET_MS,
    });
  }

  const completedAt = order.pickup.completedAt;
  if (completedAt) {
    emitCustomerServerToClient(orderId, {
      type: 'customerOrderCompleted',
      orderId,
      cafeId,
      completedAt,
      userId: order.customerId,
      ...(applyResult !== 'timeout' && applyResult.applied
        ? {
            loyalty: {
              stamps: applyResult.stamps,
              stampsPerReward: applyResult.stampsPerReward,
              rewardsAvailable: applyResult.rewardsAvailable,
            },
          }
        : {}),
    });
  }

  await recomputePickupEtasAfterOrderChange({
    db,
    cafeId,
    orderId,
    swallowErrors: true,
    logTag: 'kds.complete',
  });
}
