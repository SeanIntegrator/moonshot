# API module layout (`@moonshot/api`)

Stable map of where persistence and orchestration live after the **Pass A + B** refactor (May 2026). Routes stay thin; business logic sits in `src/lib/`.

## HTTP assembly

| Path | Role |
|------|------|
| `src/create-moonshot-http-server.ts` | Express app, routers, Socket.io, **global `errorHandler`** (last middleware) |
| `src/middleware/error-handler.ts` | Maps `ApiHttpError` → status envelope; unknown errors → **`Internal error`** + structured server log |
| `src/middleware/cafe-context.ts` | Resolves café via `findCafeBySlug` from **`cafes-repository`** |

## Café reads

| Path | Role |
|------|------|
| `src/lib/cafes-repository.ts` | `CAFE_COLUMNS`, `findCafeById`, `findCafeBySlug`, `findCafesByStripeAccountId` — single source for full café row → `ResolvedCafe` |

## Orders

Implementation is split under `src/lib/orders/`; **`orders-repository.ts`** re-exports the public surface so existing imports keep working.

| Module | Responsibility |
|--------|----------------|
| `orders/order-constants.ts` | Status sets, `ORDER_SELECT_COLUMNS`, line validation |
| `orders/order-read.ts` | `fetchOrderWithItems`, `findOrderByIdAndCafe`, batch item load |
| `orders/order-create.ts` | Pay-in-store + pending checkout order insert |
| `orders/order-checkout.ts` | Stripe session record, webhook confirm (`confirmOrderPaidFromStripeCheckout`) |
| `orders/checkout-session-recovery.ts` | Browser return: lookup by session, retrieve from Stripe if pending, confirm + **`kds:order:new`** |
| `orders/order-kds.ts` | `listOpenOrdersForKds`, `completeOrderForKds`; exports **`KDS_OPEN_ORDER_STATUSES`** |
| `orders/order-customer.ts` | `listCustomerOrdersForUser`, `cancelOrderAtCafe` |
| `orders/order-write-helpers.ts` | Shared line-item insert inside transactions |

Checkout orchestration (Stripe session creation) remains in `orders-checkout-service.ts`. Return URL building: **`order-checkout-env.ts`** (`checkoutUrlsForCafe`, **`ORDER_AHEAD_BASE_URL`**).

## Café membership

| Path | Role |
|------|------|
| `src/lib/cafe-membership.ts` | `ensureCafeMembership` — idempotent `cafe_users` insert; called on signed-in **`POST /orders`** and inside loyalty post-complete transaction |

## Loyalty

| Path | Role |
|------|------|
| `src/lib/loyalty/loyalty-rules.ts` | Stamp earn rules (double-stamp weekdays in café TZ), review on-time rule |
| `src/lib/loyalty/repository.ts` | Ledger + reward rows, `lockMembershipRow` on **`loyalty_card_progress`** |
| `src/lib/loyalty/apply-ledger-on-complete.ts` | Punch-card rollover inside caller transaction; returns **`inserted`** for idempotency |
| `src/lib/loyalty-after-kds-complete.ts` | Post-KDS transaction: ledger → counters (only if new stamp row) → review socket |

KDS route wraps `applyLoyaltyAfterKdsComplete` in try/catch so **Done** never 500s after the order is already `completed`. Ops replay: **`scripts/replay-order-loyalty.ts`** (`pnpm replay:order-loyalty`).

## Order-ahead (frontend)

| Path | Role |
|------|------|
| `src/providers/LoyaltyProvider.tsx` | Shared loyalty fetch state; pages call **`refresh()`** after auth, navigation, or order completion |
| `src/config/CafeProvider.tsx` | Sets runtime café slug for **`X-Cafe-Slug`** before child effects (Stripe return) |
| `src/pages/CheckoutRestore.tsx` | Stripe success redirect handler |

## Admin services

| Path | Role |
|------|------|
| `src/lib/admin-settings-service.ts` | `patchAdminCafeSettings` — merge features/KDS patches + persist |
| `src/lib/admin-stripe-service.ts` | Connect onboarding link + account status sync |
| `src/routes/admin.ts` | HTTP only: auth, settings PATCH, Stripe endpoints |

## Customer auth helpers

| Path | Role |
|------|------|
| `src/lib/customer-socket-token.ts` | `signTrackOrderJwt`, `buildGuestTrackingTokenIfNeeded`, socket token classification |

## Pickup ETA

| Path | Role |
|------|------|
| `src/lib/pickup-eta-params.ts` | Shared `resolveEtaParams` (base + per-item minutes) |
| `src/lib/pickup-eta.ts` | FIFO recompute for open queue |
| `src/lib/pickup-eta-estimate.ts` | Tail estimate for new orders |

## Migrations (loyalty-related)

| Migration | Change |
|-----------|--------|
| `007_loyalty_ledger.sql` | `loyalty_transactions`, `loyalty_rewards`, `loyalty_display_id` |
| `009_loyalty_card_progress_rename.sql` | `loyalty_stamps` → **`loyalty_card_progress`** |
| `010_loyalty_display_id_counter.sql` | Per-café numeric display IDs for **new** memberships |
