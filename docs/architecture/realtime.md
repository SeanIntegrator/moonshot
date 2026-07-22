# Realtime architecture (Socket.io)

The API attaches Socket.io to the same Node **HTTP server** as Express.

Two namespaces isolate audiences and middleware:

| Namespace | Client apps | Purpose |
|-----------|-------------|---------|
| **`/kds`** | moonshot-kds | Café-scoped KDS JWT in **handshake** `auth.token`. Auto-joins `kds:cafe:{cafeId}`. Events on channel `kds:event` (`KdsServerToClientEvent`). |
| **`/customer`** | moonshot-order-ahead | **No auth on connect.** After connect, emit `customer:subscribe` with `orderId` + `authToken`. Events on channel `customer:event` (`CustomerServerToClientEvent`). |

Constants: [`KDS_SOCKET_NAMESPACE`](../../packages/types/src/dataflow.ts), [`CUSTOMER_SOCKET_NAMESPACE`](../../packages/types/src/dataflow.ts).

## KDS authentication

- **Never** use the default `/` namespace for KDS (reserved for future use); connect to `{API_ORIGIN}/kds`.
- Token is the same JWT returned by `POST /api/v1/kds/auth/login`; claims include `purpose: 'kds'`.
- The app does **not** emit `kds:subscribe`; auth is handshake-only (`KdsSocketHandshakeAuth` in `@moonshot/types`).

## Customer order tracking

Order-ahead surfaces:

| Surface | Push | HTTP fallback |
|---------|------|---------------|
| **Order detail** (`useOrderTracking`) | `customer:subscribe` for that order | 5s poll while active |
| **Home / Profile lists** (`ActiveOrdersProvider`) | subscribe to each active order id | 30s poll |

Subscribing requires **one** of:

1. **Guest** — `authToken` is a **`trackingToken`** JWT from `POST /api/v1/orders` (`purpose: 'track_order'`, short TTL ~48h, scoped to `orderId` + `cafeId`). Only valid while `orders.user_id` IS NULL for that row.
2. **Signed-in** — `authToken` is the **Google/session JWT** from `POST /api/v1/auth/google`. Must match `orders.user_id` for the subscribed order.

The raw order UUID alone is **not** sufficient — this avoids unauthenticated listens if an id leaks.

`NormalisedOrder.editToken` serves other flows (e.g. merge); it is distinct from **`trackingToken`**.

## Server-side emissions

| Trigger | Audience | Event |
|---------|----------|-------|
| Pay-in-store `POST /orders` committed | `/kds` | `kds:order:new` |
| Stripe `checkout.session.completed` (paid) | `/kds` | `kds:order:new` |
| `POST /kds/orders/:id/complete` | `/kds` | `kds:order:removed` |
| `POST /kds/orders/:id/status` | `/kds` | `kds:order:updated` |
| Same status route | `/customer` room `customer:order:{id}` | `customerOrderStatusUpdated` |
| Queue/ETA recompute (FIFO; skips `manual_override`) | `/kds` | `kds:eta:updated` |
| Same ETA recompute / barista stretch | `/customer` room `customer:order:{id}` | `customerEtaUpdated` |
| Same complete route | `/customer` room `customer:order:{id}` | `customerOrderCompleted` |
| Loyalty/review threshold (optional) | `/customer` | `customerReviewEligible` |
