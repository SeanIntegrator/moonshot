# Current HTTP surface & CORS

All versioned routes use prefix **`/api/v1`** (`API_VERSION_PREFIX` from `@moonshot/types`).

## Unversioned

- `GET /` — service metadata
- `GET /health` — liveness

## Versioned

- `GET /api/v1/health`
- `GET /api/v1/cafe/:slug` — public café + active feature flags (`X-Cafe-Slug` optional on other routes)
- **Auth (Google / customer JWT)**
  - `POST /api/v1/auth/google` — `{ credential, cafeSlug }` → JWT
  - `GET /api/v1/auth/me` — `Authorization` + café context
- **Menu**
  - `GET /api/v1/menu`, `GET /api/v1/menu/:segment` — public reads (`X-Cafe-Slug`)
  - `POST/PATCH/DELETE /api/v1/menu` — café-scoped **`purpose: admin`** JWT, or Google customer JWT when email is in **`MENU_ADMIN_EMAILS`** (`X-Cafe-Slug` + `Authorization`)
- **Orders**
  - `POST /api/v1/orders` — guest or **optional** `Authorization: Bearer` session JWT; sets `orders.user_id` when signed in. **`X-Cafe-Slug`** required. Behaviour depends on `features.order_ahead.paymentProvider`:
    - **`pay_in_store`** — persists **`confirmed` / `unpaid`**, emits **`kds:order:new`** immediately, validates **modifiers** against menu JSON.
    - **`stripe`** — requires **Stripe Connect onboarding complete** (`chargesEnabled` on the connected account). Creates **`pending` / `unpaid`** order + **Stripe Checkout** session; response includes **`checkoutUrl`**. **`kds:order:new`** fires only after **`checkout.session.completed`** webhook marks the order **`paid` / `confirmed`**. Guests receive **`trackingToken`** when `JWT_SECRET` is set (same as pay-in-store).
  - `GET /api/v1/orders/checkout-session/:sessionId` — **`X-Cafe-Slug`** required; validates Stripe Checkout session id (`cs_…`). Returns **`CreateOrderResponse`** so order-ahead can restore state after the Stripe success redirect (`checkout_session_id` query param). Guest **`trackingToken`** included when `JWT_SECRET` is set and the order has no `user_id`.
- **Webhooks**
  - `POST /api/v1/webhooks/stripe` — **raw body**; **`Stripe-Signature`** verification. Handles `checkout.session.completed` and `account.updated` (idempotent via `webhook_events` with **`processing_status`** so failed deliveries remain retryable).
- **Admin (pre-seeded / invite-ready accounts)**
  - `POST /api/v1/admin/auth/login` — `{ email, password }` → JWT (`purpose: admin`)
  - `GET /api/v1/admin/auth/me` — `Authorization: Bearer`
  - `PATCH /api/v1/admin/settings` — `Authorization: Bearer`; body `featuresPatch` (`loyalty`, `order_ahead`) and/or `kdsConfigPatch` (whitelisted KDS keys); merges into `cafes.features` / `cafes.kds_config`
  - `POST /api/v1/admin/payments/stripe/onboarding-link` — `Authorization: Bearer`; creates Express connected account if needed, returns Stripe-hosted **Account Link** URL.
  - `GET /api/v1/admin/payments/stripe/status` — `Authorization: Bearer`; syncs **`chargesEnabled`** etc. into `cafes.payment_config.stripe`.
- **KDS**
  - `POST /api/v1/kds/auth/login`
  - `GET /api/v1/kds/orders`
  - `POST /api/v1/kds/orders/:orderId/complete`

## CORS & Socket.io origin allowlist

Production uses **`CORS_ORIGINS`**: comma-separated full origins (scheme + host, no trailing slash), e.g.:

- `https://moonshot-order-ahead-production.up.railway.app`
- `https://moonshot-kds-production.up.railway.app`
- `https://moonshot-admin-production.up.railway.app`

When **`NODE_ENV === 'production'`** and `CORS_ORIGINS` is empty, browser **`Origin`** requests are **denied** (clients that omit `Origin` still succeed).

Development without `CORS_ORIGINS` stays permissive and allows common localhost Vite ports (`localhost:5173`, …). Implemented in `@moonshot/api` [`cors-origins.ts`](../../apps/moonshot-api/src/lib/cors-origins.ts).

Swap Railway hostnames for custom domains by updating **`CORS_ORIGINS`** only.

## Environment variables (API)

See [apps/moonshot-api/.env.example](../../apps/moonshot-api/.env.example).

## Front-end env

**Order-ahead / KDS / Admin:** `VITE_API_URL` = API origin **only** (no `/api/v1` suffix), plus `VITE_CAFE_SLUG`, `VITE_GOOGLE_CLIENT_ID` where applicable.
