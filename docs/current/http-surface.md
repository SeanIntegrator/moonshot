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
  - `POST/PATCH/DELETE /api/v1/menu` — admin emails in `MENU_ADMIN_EMAILS`
- **Orders**
  - `POST /api/v1/orders` — guest or **optional** `Authorization: Bearer` session JWT; sets `orders.user_id` when signed in. Guest responses may include **`trackingToken`** (for Socket `/customer` subscribe). **`X-Cafe-Slug`** required.
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
