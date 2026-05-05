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

The HTTP server also hosts **Socket.io**. KDS clients authenticate with the same JWT as HTTP (`auth.token`). Events are emitted on `kds:event` with payloads matching `KdsServerToClientEvent` in `@moonshot/types`.
