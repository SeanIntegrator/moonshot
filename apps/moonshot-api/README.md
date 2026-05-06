# @moonshot/api

Express + TypeScript API gateway. `pnpm dev` uses `tsx watch`; production uses `node dist/index.js` after `pnpm build`.

## Database

Run migrations (requires `DATABASE_URL`):

```bash
pnpm migrate
```

## Tests

```bash
pnpm test
```

Vitest covers CORS parsing and customer socket JWT classification (`src/**/*.test.ts`).

## KDS device login

After migration `kds_users` exists. Create or update a KDS user from **environment variables only** (do not commit credentials):

```bash
# from apps/moonshot-api with .env loaded
KDS_BOOTSTRAP_CAFE_SLUG=clay-and-bean KDS_BOOTSTRAP_USERNAME=kds1 KDS_BOOTSTRAP_PASSWORD='your-long-secret' pnpm bootstrap:kds-user
```

Then sign in from `moonshot-kds` with the same slug and username.

## Realtime

The HTTP server hosts **Socket.io** on two namespaces:

| Namespace | Client | Auth |
|-----------|--------|------|
| **`/kds`** | `moonshot-kds` | JWT from `POST /api/v1/kds/auth/login` in `auth.token` handshake only |
| **`/customer`** | `moonshot-order-ahead` | After connect, emit `customer:subscribe` with `orderId` + **`authToken`**: guest **`trackingToken`** from `POST /orders`, or **Google session JWT** if the order row has `user_id` |

- **KDS**: `io('{API_ORIGIN}/kds', { auth: { token } })`. Events on **`kds:event`** (`KdsServerToClientEvent`).
- **Customer**: `io('{API_ORIGIN}/customer')`. Events on **`customer:event`** (`CustomerServerToClientEvent`).

**Orders:** optional `Authorization` on `POST /api/v1/orders` links the row to the signed-in user; guests get **`trackingToken`** in the JSON response for subscribe.

## CORS / Socket.io origins

Configure **`CORS_ORIGINS`** (comma-separated HTTPS origins). In **production**, an empty allowlist denies browser **`Origin`** headers until you set Railway front-end URLs — see `.env.example` and **`docs/current/http-surface.md`**.

**URL note:** the namespace follows the origin (`io('https://api.example.com/kds')`). The engine uses path `/socket.io` automatically.
