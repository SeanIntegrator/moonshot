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
  - `POST /api/v1/menu/:itemId/image` — multipart field **`image`** (JPEG/PNG/WebP); admin JWT + `X-Cafe-Slug`; resizes to WebP thumbnail in Railway Object Storage. See [menu-images.md](../menu-images.md).
- **Media**
  - `GET /api/v1/media/*` — public catalogue thumbnails streamed from the private bucket (allowlisted object keys only). See [menu-images.md](../menu-images.md).
- **Orders**
  - `POST /api/v1/orders` — guest or **optional** `Authorization: Bearer` session JWT; sets `orders.user_id` when signed in. **`X-Cafe-Slug`** required. Behaviour depends on `features.order_ahead.paymentProvider`:
    - **`pay_in_store`** — persists **`confirmed` / `unpaid`**, emits **`kds:order:new`** immediately, validates **modifiers** against menu JSON.
    - **`stripe`** — requires **Stripe Connect onboarding complete** (`chargesEnabled` on the connected account). Creates **`pending` / `unpaid`** order + **Stripe Checkout** session; response includes **`checkoutUrl`**. **`kds:order:new`** fires only after **`checkout.session.completed`** webhook marks the order **`paid` / `confirmed`**. Guests receive **`trackingToken`** when `JWT_SECRET` is set (same as pay-in-store).
  - `GET /api/v1/orders/me` — signed-in customer active + recent orders (`Authorization` + café context).
  - `GET /api/v1/orders/pickup-estimate` — read-only ETA tail estimate for the café (`X-Cafe-Slug`).
  - `GET /api/v1/orders/:orderId` — optional session JWT **or** guest `?trackingToken=` (same JWT purpose as socket subscribe).
  - `POST /api/v1/orders/:orderId/cancel` — same auth model as GET; sets **`cancelled`** for open statuses; **Stripe refunds are not implemented** — paid orders return **`refundPending: true`** until a refunds phase lands.
  - `GET /api/v1/orders/checkout-session/:sessionId` — **`X-Cafe-Slug`** required; validates session id shape (`cs_` plus alphanumeric / underscores, max length). Looks up order via **`payment_sessions`**, then **`recoverOrderFromStripeCheckoutSession`**: if still **`pending`**, retrieves the Stripe session on the connected account and confirms payment (idempotent with webhook). Returns **`CreateOrderResponse`** so order-ahead can restore state after the Stripe success redirect (`checkout_session_id` query param). Emits **`kds:order:new`** when this path newly confirms payment. Guest **`trackingToken`** included when `JWT_SECRET` is set and the order has no `user_id`. Details: [stripe-checkout-return.md](../stripe-checkout-return.md).
- **Loyalty (signed-in, café context)**
  - `GET /api/v1/loyalty/me` — stamps progress, rewards available, **`displayId`** for till / QR.
  - `GET /api/v1/loyalty/transactions` — paginated ledger (`limit`, `cursor`).
  - `GET /api/v1/loyalty/rewards` — unredeemed rewards.
  - `POST /api/v1/loyalty/rewards/:rewardId/redeem` — sets **`redeemed_at`**, appends **`reward_redeemed`** ledger row.
- **Webhooks**
  - `POST /api/v1/webhooks/stripe` — **raw body**; **`Stripe-Signature`** verification. Handles `checkout.session.completed` and `account.updated` (idempotent via `webhook_events` with **`processing_status`** so failed deliveries remain retryable).
- **Admin (pre-seeded / invite-ready accounts)**
  - `POST /api/v1/admin/auth/login` — `{ email, password }` → JWT (`purpose: admin`)
  - `GET /api/v1/admin/auth/me` — `Authorization: Bearer`
  - `PATCH /api/v1/admin/settings` — `Authorization: Bearer`; body `featuresPatch` (`loyalty`, `order_ahead`) and/or `kdsConfigPatch` (whitelisted KDS keys); merges into `cafes.features` / `cafes.kds_config`
  - `POST /api/v1/admin/payments/stripe/onboarding-link` — `Authorization: Bearer`; creates Express connected account if needed, returns Stripe-hosted **Account Link** URL.
  - `GET /api/v1/admin/payments/stripe/status` — `Authorization: Bearer`; syncs **`chargesEnabled`** etc. into `cafes.payment_config.stripe`.
  - `GET /api/v1/admin/payments/stripe/return` — Stripe **return_url** (no JWT); signed `state` → sync account → **302** to admin (`?stripeConnect=return`).
  - `GET /api/v1/admin/payments/stripe/refresh` — Stripe **refresh_url** (no JWT); signed `state` → new Account Link → **302** to Stripe.
- **KDS**
  - `POST /api/v1/kds/auth/login`
  - `GET /api/v1/kds/orders`
  - `POST /api/v1/kds/orders/:orderId/complete`

## CORS & Socket.io origin allowlist

Production uses **`CORS_ORIGINS`**: comma-separated full origins (scheme + host, no trailing slash). Values must match each frontend’s **exact** public origin (copy from the browser address bar).

Railway often exposes **two** public hostnames per service (hyphenated vs compacted). Both must be listed if both are used. Live matrix (as of debugging):

| Role | Origins to allow |
|------|------------------|
| Order-ahead | `https://moonshotorder-ahead-production.up.railway.app` |
| KDS | `https://moonshot-kds-production.up.railway.app` **and** `https://moonshotkds-production.up.railway.app` |
| Admin | `https://moonshot-admin-production.up.railway.app` **and** `https://moonshotadmin-production.up.railway.app` |

API: use **`https://moonshotapi-production.up.railway.app`** only. `moonshot-api-production` (extra hyphen) is a separate broken deploy (login returns 500). A near-miss hostname, trailing slash, or `http` vs `https` is treated as denied.

When **`NODE_ENV === 'production'`** and `CORS_ORIGINS` is empty, browser **`Origin`** requests are **denied** (clients that omit `Origin` still succeed). Denied origins are logged as `[cors] denied origin …` on the API.

Development without `CORS_ORIGINS` stays permissive and allows common localhost Vite ports (`localhost:5173`, …). Implemented in `@moonshot/api` [`cors-origins.ts`](../../apps/moonshot-api/src/lib/cors-origins.ts).

Swap Railway hostnames for custom domains by updating **`CORS_ORIGINS`** only.

## Environment variables (API)

See [apps/moonshot-api/.env.example](../../apps/moonshot-api/.env.example).

## Front-end env

**Order-ahead / KDS / Admin:** `VITE_API_URL` = API origin **only** (no `/api/v1` suffix), plus `VITE_CAFE_SLUG`, `VITE_GOOGLE_CLIENT_ID` where applicable.

Vite frontends load **`/runtime-config.js`** at startup. It is written from `VITE_API_URL` by `scripts/write-runtime-config.mjs`:

- **`postbuild`** — runs automatically after `pnpm build` (Railway build phase; needs `VITE_API_URL` in build env)
- **`pnpm start`** — runs again at container start (pick this as the Railway **start command** for admin/KDS/order-ahead instead of bare `vite preview`)

Use the literal working API host (`https://moonshotapi-production.up.railway.app`). If `/runtime-config.js` still shows `apiUrl: ''`, the write script did not run — check build logs for `[runtime-config]` and fix the start command.
