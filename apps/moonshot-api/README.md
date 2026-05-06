# @moonshot/api

Express + TypeScript API gateway. `pnpm dev` uses `tsx watch`; production uses `node dist/index.js` after `pnpm build`.

## Database

Run migrations (requires `DATABASE_URL`):

```bash
pnpm migrate
```

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
| **`/kds`** | `moonshot-kds` | JWT from `POST /api/v1/kds/auth/login` in `auth.token` handshake |
| **`/customer`** | `moonshot-order-ahead` (order tracking) | None for guest flow; optional customer JWT in `customer:subscribe` for future use |

- **KDS**: connect to `{API_ORIGIN}/kds`. Events on `kds:event` with payloads matching `KdsServerToClientEvent` in `@moonshot/types`.
- **Customer**: connect to `{API_ORIGIN}/customer`. After connect, emit `customer:subscribe` with `{ type: 'customer:subscribe', orderId }`. Events on `customer:event` with payloads matching `CustomerServerToClientEvent`.

**URL note:** `socket.io-client` uses the path `/socket.io` on the same host; the namespace is the URL path segment after the origin (e.g. `io('https://api.example.com/kds')`).
