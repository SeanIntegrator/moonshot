import type { KdsServerToClientEvent, NormalisedOrder, NormalisedOrderItem } from '@moonshot/types';

export type OrdersStoreContext = {
  /** Dismissing cards and in-flight optimistic recalls must survive a poll. */
  isProtected: (orderId: string) => boolean;
  hasPending: (orderId: string) => boolean;
};

export function sortOrders(orders: NormalisedOrder[]): NormalisedOrder[] {
  if (orders.length <= 1) return orders;
  for (let i = 1; i < orders.length; i++) {
    if (orders[i - 1]!.createdAt.localeCompare(orders[i]!.createdAt) > 0) {
      return [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
  }
  return orders;
}

function sameStringList(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, i) => value === b[i]);
}

function sameBoardItem(a: NormalisedOrderItem, b: NormalisedOrderItem): boolean {
  return (
    a.id === b.id &&
    a.quantity === b.quantity &&
    a.itemName === b.itemName &&
    a.notes === b.notes &&
    a.category === b.category &&
    a.unitPriceMinor === b.unitPriceMinor &&
    sameStringList(a.allergens, b.allergens) &&
    JSON.stringify(a.modifiers) === JSON.stringify(b.modifiers)
  );
}

function sameBoardSnapshot(a: NormalisedOrder, b: NormalisedOrder): boolean {
  return (
    a.id === b.id &&
    a.status === b.status &&
    a.updatedAt === b.updatedAt &&
    a.pickup.pickupTime === b.pickup.pickupTime &&
    a.notes === b.notes &&
    a.detailsPending === b.detailsPending &&
    a.items.length === b.items.length &&
    a.items.every((item, i) => sameBoardItem(item, b.items[i]!))
  );
}

function sameBoardList(a: NormalisedOrder[], b: NormalisedOrder[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((order, i) => sameBoardSnapshot(order, b[i]!));
}

function upsert(prev: NormalisedOrder[], order: NormalisedOrder): NormalisedOrder[] {
  const existing = prev.find((o) => o.id === order.id);
  if (existing && sameBoardSnapshot(existing, order)) {
    return sortOrders(prev);
  }
  return sortOrders([...prev.filter((o) => o.id !== order.id), order]);
}

/**
 * Apply a KDS socket event. Returns `prev` when the board would not change.
 */
export function applyKdsEvent(
  prev: NormalisedOrder[],
  ev: KdsServerToClientEvent,
  ctx: OrdersStoreContext,
): NormalisedOrder[] {
  switch (ev.type) {
    case 'kds:order:new':
      return upsert(prev, ev.order);
    case 'kds:order:removed': {
      if (!prev.some((o) => o.id === ev.orderId)) return prev;
      return prev.filter((o) => o.id !== ev.orderId);
    }
    case 'kds:order:updated': {
      if (ctx.isProtected(ev.order.id)) return prev;
      if (ctx.hasPending(ev.order.id)) {
        const local = prev.find((o) => o.id === ev.order.id);
        const merged = local ? { ...ev.order, status: local.status } : ev.order;
        return upsert(prev, merged);
      }
      return upsert(prev, ev.order);
    }
    case 'kds:eta:updated': {
      let changed = false;
      const next = prev.map((o) => {
        const u = ev.updates.find((x) => x.orderId === o.id);
        if (!u || o.pickup.pickupTime === u.pickupTime) return o;
        changed = true;
        return { ...o, pickup: { ...o.pickup, pickupTime: u.pickupTime } };
      });
      return changed ? next : prev;
    }
    default:
      return prev;
  }
}

/**
 * Merge an HTTP snapshot into the live board. Keeps dismissing cards and
 * in-flight optimistic recalls. Returns `prev` when the visible board is unchanged.
 */
export function mergeRemoteOrders(
  prev: NormalisedOrder[],
  remote: NormalisedOrder[],
  ctx: OrdersStoreContext,
): NormalisedOrder[] {
  const byId = new Map(remote.map((o) => [o.id, o]));
  const merged: NormalisedOrder[] = prev
    .filter((o) => ctx.isProtected(o.id) || byId.has(o.id))
    .map((o) => {
      if (ctx.isProtected(o.id)) return o;
      const remoteOrder = byId.get(o.id)!;
      if (ctx.hasPending(o.id)) {
        return { ...remoteOrder, status: o.status };
      }
      return remoteOrder;
    });
  for (const o of remote) {
    if (!merged.some((m) => m.id === o.id)) merged.push(o);
  }
  const sorted = sortOrders(merged);
  return sameBoardList(prev, sorted) ? prev : sorted;
}
