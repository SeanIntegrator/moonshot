# API module layout (`@moonshot/api`)

Stable map of where persistence and orchestration live after the **Pass A + B** refactor and the later **`src/lib/` domain-folder** split (`menu/`, `cafe/`, `admin/`, `orders/`, `pos-adapters/`, …). Routes stay thin; business logic sits in `src/lib/`.

## HTTP assembly

| Path | Role |
|------|------|
| `src/create-moonshot-http-server.ts` | Express app, routers, Socket.io (`/kds`, `/customer`, `/admin`), **global `errorHandler`** (last middleware) |
| `src/middleware/error-handler.ts` | Maps `ApiHttpError` → status envelope; unknown errors → **`Internal error`** + structured server log |
| `src/middleware/cafe-context.ts` | Resolves café via `findCafeBySlug` from **`cafes-repository`** |

## Café reads & provisioning

| Path | Role |
|------|------|
| `src/lib/cafes-repository.ts` | `CAFE_COLUMNS`, `findCafeById`, `findCafeBySlug`, `findCafesByStripeAccountId` — full café row → `ResolvedCafe` |
| `src/lib/cafe/cafe-provisioning.ts` | Self-service signup defaults (`defaultNewCafeFeatures`, KDS config, modifier/section seed) |
| `src/lib/cafe/cafe-membership.ts` | `ensureCafeMembership` — idempotent `cafe_users` insert |
| `src/lib/cafe/cafe-map.ts` / hours helpers | Feature flags + open/closed helpers |

## Orders

Implementation is split under `src/lib/orders/` (`order-read`, `order-create`, `order-checkout`, `order-kds`, `order-customer`, plus checkout recovery and POS ingress). Import those modules directly.

| Module | Responsibility |
|--------|----------------|
| `orders/order-constants.ts` | Status sets, `ORDER_SELECT_COLUMNS`, line validation |
| `orders/order-read.ts` | `fetchOrderWithItems`, `findOrderByIdAndCafe`, batch item load |
| `orders/order-create.ts` | Pay-in-store + pending checkout order insert |
| `orders/order-checkout.ts` | Stripe session record, webhook confirm (`confirmOrderPaidFromStripeCheckout`) |
| `orders/checkout-session-recovery.ts` | Browser return: lookup by session, retrieve from Stripe if pending, confirm + **`kds:order:new`** |
| `orders/order-kds.ts` | Open/recent lists, complete, recall; exports **`KDS_OPEN_ORDER_STATUSES`** |
| `orders/order-customer.ts` | `listCustomerOrdersForUser`, `cancelOrderAtCafe` |
| `orders/pos-order-ingress.ts` | Square (etc.) webhook → persist normalised order + KDS emit |
| `orders/order-write-helpers.ts` | Shared line-item insert inside transactions |

Checkout orchestration (Stripe session creation) remains in `orders-checkout-service.ts`. Return URL building: **`order-checkout-env.ts`** (`checkoutUrlsForCafe`, **`ORDER_AHEAD_BASE_URL`**).

## Menu

| Path | Role |
|------|------|
| `src/lib/menu/` | Admin CRUD, sections, images, catalog persist/sync, template onboarding, seed library |
| `src/lib/menu/menu-provisioners/` | Template vs POS import strategies for onboarding |
| `src/lib/drink-archetype-*.ts` | Resolve + apply café drink-type recipes |

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

## Admin + POS services

| Path | Role |
|------|------|
| `src/lib/admin/admin-settings-service.ts` | `patchAdminCafeSettings` — merge features/KDS patches + persist |
| `src/lib/admin/admin-stripe-service.ts` | Connect onboarding link + account status sync |
| `src/lib/pos-connections-repository.ts` | Encrypted Square (etc.) OAuth rows |
| `src/lib/pos-adapters/` | Manual + Square adapters (catalog sync, token refresh, webhooks) |
| `src/routes/admin.ts` | HTTP only: auth, settings, Stripe, Square mount, sync-pos |

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
