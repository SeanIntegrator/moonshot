# @moonshot/api

Express + TypeScript API gateway. `pnpm dev` uses `tsx watch`; production uses `node dist/index.js` after `pnpm build`.

## Database

Run migrations (requires `DATABASE_URL`):

```bash
pnpm migrate
```

## Source layout (lib)

Persistence is grouped by domain under `src/lib/` (folders such as `menu/`, `cafe/`, `admin/`, `orders/`, `pos-adapters/`):

| Area | Entry / modules |
|------|-----------------|
| Cafés | `cafes-repository.ts`, `cafe/` (provisioning, hours, map) |
| Orders | `orders/order-{read,create,checkout,kds,customer}.ts` (+ POS ingress / payment helpers) |
| Menu | `menu/` (admin, sections, sync, images, provisioners) |
| Loyalty | `loyalty/`, `loyalty-after-kds-complete.ts` |
| Admin | `admin/` (settings, Stripe, auth tokens, onboarding repo) |
| POS | `pos-adapters/`, `pos-connections-repository.ts`, `pos-catalog/` |
| Errors | `middleware/error-handler.ts` (registered last on the Express app) |

See **`docs/architecture/api-modules.md`** for the full map.

## Tests

```bash
pnpm test
```

Vitest loads `src/**/*.test.ts`.

- **Always-on:** pure unit tests (e.g. modifier resolution, checkout orchestration mocks, HTTP validation for checkout-session route shape).
- **Integration:** `*.integration.test.ts` files run **only when `DATABASE_URL` or `TEST_DATABASE_URL`** is set (same Postgres as migrations applied). They use scoped fixtures and cover **`webhook_events` lifecycle**, **checkout recovery** via `payment_sessions`, and **customer order reads/cancel** (`customer-orders.integration.test.ts`).

CI without a database still passes; set **`TEST_DATABASE_URL`** locally or in CI to execute DB-backed suites.

## KDS device login

Self-service cafés create a KDS user during **admin onboarding** (`POST /admin/onboarding/kds-users`). For seed/dev cafés, create or update a user from **environment variables only** (do not commit credentials):

```bash
# from apps/moonshot-api with .env loaded
KDS_BOOTSTRAP_CAFE_SLUG=clay-and-bean KDS_BOOTSTRAP_USERNAME=kds1 KDS_BOOTSTRAP_PASSWORD='your-long-secret' pnpm bootstrap:kds-user
```

Then sign in from `moonshot-kds` with the same slug and username.

## Realtime

The HTTP server hosts **Socket.io** on three namespaces:

| Namespace | Client | Auth |
|-----------|--------|------|
| **`/kds`** | `moonshot-kds` | JWT from `POST /api/v1/kds/auth/login` in `auth.token` handshake only |
| **`/customer`** | `moonshot-order-ahead` | After connect, emit `customer:subscribe` with `orderId` + **`authToken`**: guest **`trackingToken`** from `POST /orders`, or **Google session JWT** if the order row has `user_id` |
| **`/admin`** | `moonshot-admin` | Admin JWT in handshake; café-scoped rooms (e.g. menu sync notify) |

- **KDS**: `io('{API_ORIGIN}/kds', { auth: { token } })`. Events on **`kds:event`** (`KdsServerToClientEvent`).
- **Customer**: `io('{API_ORIGIN}/customer')`. Events on **`customer:event`** (`CustomerServerToClientEvent`).
- **Admin**: `io('{API_ORIGIN}/admin', { auth: { token } })`. Menu sync and related admin events.

**Orders:** optional `Authorization` on `POST /api/v1/orders` links the row to the signed-in user; guests get **`trackingToken`** in the JSON response for subscribe.

## CORS / Socket.io origins

Configure **`CORS_ORIGINS`** (comma-separated HTTPS origins). In **production**, an empty allowlist denies browser **`Origin`** headers until you set Railway front-end URLs — see `.env.example` and **`docs/current/http-surface.md`**.

**URL note:** the namespace follows the origin (`io('https://api.example.com/kds')`). The engine uses path `/socket.io` automatically.
