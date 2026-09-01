# Square OAuth, token refresh, catalog sync, and order webhooks

Connects a café's Square seller account during admin onboarding, imports the Item Library into Moonshot Postgres, keeps the menu in sync via `catalog.version.updated` + Admin Sync + daily cron, refreshes OAuth tokens on a schedule, and ingests till/POS tickets through an app-level webhook.

Clay & Bean cutover from any hand-wired legacy token remains a separate step ([roadmap](architecture/roadmap.md) Workstream 7).

## Flow

```mermaid
flowchart TD
  Choice["Menu step: Connect with Square"] --> Onboard["POST /admin/connect/square/onboard"]
  Onboard --> Authorize["Square authorize URL + signed state"]
  Authorize --> Ret["GET /admin/connect/square/return"]
  Ret --> Token["oAuth.obtainToken authorization_code"]
  Token --> Store["pos_connections AES-256-GCM"]
  Store --> SPA["Admin /onboarding/import-pos?squareConnect=connected"]
  SPA --> Import["POST /admin/onboarding/menu-pos-import"]
  Import --> Catalog["Square Catalog API"]
  Catalog --> Persist["persistNormalisedMenuCatalog"]
  Persist --> PG[(menu_items + modifier_groups)]

  Cron["Railway cron every 6–12h"] --> Refresh["POST /internal/pos/refresh-tokens"]
  Refresh --> Obtain["ObtainToken refresh_token"]
  Obtain --> Store

  SquareWH["Square order.* + catalog.version.updated + oauth.authorization.revoked"] --> WH["POST /webhooks/square"]
  WH --> Verify["HMAC + webhook_events claim"]
  Verify --> Route["merchant_id → cafe"]
  Route --> Ingress["persistPosOrderEvent + KDS emit"]
  Route --> CatSync["debounce → SearchCatalog → upsert menu"]
```

## Decision record

**Square owns items and modifier lists.** Moonshot layers only Flow prep groups Square cannot express (Shots, Beans, Milk Temperature, Milk Texture, Ice Level, Toppings) via drink-archetype name inference. Square list names are kept as-is; they are appended into `cafes.kds_config.modifierClassification` so the KDS chip taxonomy still resolves.

**Customer menu reads stay on Postgres.** `GET /menu` uses `fetchMenuForCafe` — flipping `pos_provider` to `square` must never turn every customer load into a Square API call. POS adapters are for sync/ingress only.

**App-level webhooks (one URL, one signature key).** Route by `merchant_id` via `pos_connections`. Unknown merchants are ACK'd and ignored to avoid Square retry storms.

## API routes

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `POST` | `/admin/connect/square/onboard` | Admin JWT | Returns Square authorize URL |
| `GET` | `/admin/connect/square/return` | Public (signed `state`) | Code exchange + token store + redirect |
| `GET` | `/admin/connect/square/status` | Admin JWT | Connection + locations |
| `POST` | `/admin/connect/square/disconnect` | Admin JWT | Revoke + delete |
| `POST` | `/admin/onboarding/menu-pos-import` | Admin JWT | Catalog → normalise → Postgres |
| `POST` | `/internal/pos/refresh-tokens` | `CRON_SECRET` | Refresh due Square access tokens |
| `POST` | `/internal/pos/sync-catalogs` | `CRON_SECRET` | Safety-net catalog sync (stale >1 day) |
| `POST` | `/internal/orders/expire-stale` | `CRON_SECRET` | Auto-cancel open orders older than 16h (`auto_expire`) |
| `POST` | `/admin/menu/sync-pos` | Admin JWT | Force Square → Moonshot menu sync |
| `POST` | `/webhooks/square` | Square HMAC | Order ingress + catalog sync enqueue |

## Token storage

OAuth tokens live in `pos_connections` (not `cafes.pos_config`):

- Encrypted with AES-256-GCM (`POS_TOKEN_ENCRYPTION_KEY`, base64 32-byte key)
- Format `v1:<iv>:<tag>:<ciphertext>`
- Decrypted only in `pos-connections-repository.ts`
- Unique on `(cafe_id, provider)` and `(provider, merchant_id)` — merchant id routes webhooks

Generate a local key:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Token refresh job

Access tokens expire after ~30 days. The refresh job:

1. Selects `pos_connections` where `provider = square`, `status = active`, and (`access_token_expires_at` within 7 days **or** `last_refreshed_at` older than 7 days).
2. Calls Square `ObtainToken(grant_type=refresh_token)`.
3. Upserts ciphertext + `access_token_expires_at` + `last_refreshed_at`.
4. On permanent auth failure (revoked / invalid refresh): sets `status = needs_reauth` (no infinite retry).
5. **`oauth.authorization.revoked` webhook:** sets `status = revoked` immediately (seller removed app access in Square Dashboard).
6. **Stale-token alert:** loading an active connection whose last refresh is older than ~8 days (or already expired) emits a structured `console.error` with café id + merchant id (never token values).

### Railway cron

Create a Railway cron service (or cron schedule) that hits the production API:

```bash
curl -X POST "https://moonshotapi-production.up.railway.app/api/v1/internal/pos/refresh-tokens" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

Recommended schedule: every **6–12 hours** (roadmap requires ≤7 days; frequent runs are cheap).

Also schedule stale-order expiry (hourly is fine; idempotent):

```bash
curl -X POST "https://moonshotapi-production.up.railway.app/api/v1/internal/orders/expire-stale" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

Set the same `CRON_SECRET` on the API service and the cron caller. Optional header alternative: `X-Cron-Secret`.

## Order webhooks

### Dashboard (ops)

1. In Square Developer Dashboard → Webhooks, create **one** app-level subscription.
2. Notification URL: `https://moonshotapi-production.up.railway.app/api/v1/webhooks/square` (must match `SQUARE_WEBHOOK_NOTIFICATION_URL` exactly — trailing slash matters for HMAC).
3. Copy the signature key → `SQUARE_WEBHOOK_SIGNATURE_KEY`.
4. Subscribe at minimum to:
   - `order.created`
   - `order.updated`
   - `order.fulfillment.updated`
   - `catalog.version.updated`
   - `oauth.authorization.revoked`

### Catalog sync (Square → Moonshot)

Square is source of truth for items, prices, **category hierarchy**, modifier lists, availability, and **images**. Moonshot Flow prep groups (shots, beans, milk temp/texture, ice, toppings) are **opt-in** via admin drink types — never auto-attached on import/sync.

1. `catalog.version.updated` enqueues a **debounced** (~45s) sync per café.
2. Incremental `SearchCatalogObjects(begin_time=cursor)` (or full List on first sync / Admin force).
3. Normalise to `PosCatalog` (mirrors Square parent/child categories + modifier ordinals) → `upsertPosCatalog`.
4. On success, emit `admin:menu:synced` and `customerMenuUpdated` so Admin / order-ahead soft-reload (no 10s poll).
5. Admin **Sync from Square** calls `POST /admin/menu/sync-pos`.
6. Daily cron: `POST /internal/pos/sync-catalogs` with `CRON_SECRET` (missed webhooks).

Cursor lives on `pos_connections.catalog_sync_cursor` / `catalog_last_synced_at`. See [pos-normalisation.md](./pos-normalisation.md).

### Order runtime

1. Verify `x-square-hmacsha256-signature` over `{notificationUrl}{rawBody}`.
2. Claim `webhook_events` with `provider = square` and Square `event_id` (idempotent).
3. Resolve café via `findCafeIdByMerchantId`.
4. Refresh-on-demand if the access token is near expiry, then `RetrieveOrder`.
5. `persistPosOrderEvent` upserts `orders` with `source = pos` and unique `(cafe_id, pos_order_id)`, then emits `kds:order:new` / `updated` / `removed`.

Canceled Square orders → Moonshot `cancelled` + KDS remove. Mapping of modifiers is best-effort for launch (name/qty/notes); deep chip parity can iterate after C&B cutover.

## Env vars (API)

| Variable | Purpose |
|----------|---------|
| `SQUARE_APPLICATION_ID` | Square app client id |
| `SQUARE_APPLICATION_SECRET` | Square app secret |
| `SQUARE_ENVIRONMENT` | `sandbox` (default) or `production` |
| `SQUARE_OAUTH_REDIRECT_URL` | Must match the redirect URL registered in Square Dashboard |
| `SQUARE_CONNECT_ADMIN_REDIRECT_URL` | Where the browser lands after OAuth |
| `POS_TOKEN_ENCRYPTION_KEY` | Base64 32-byte AES key |
| `CRON_SECRET` | Bearer / `X-Cron-Secret` for `/internal/pos/*` |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | App-level webhook signature key from Dashboard |
| `SQUARE_WEBHOOK_NOTIFICATION_URL` | Exact notification URL used in HMAC (prod default: Railway API `/api/v1/webhooks/square`) |

## Sandbox setup

1. Create a Square Developer application (Sandbox).
2. Under **OAuth**, add the redirect URL above.
3. Create a Sandbox seller / Test account and add a few items + modifier lists (Milks / Syrups).
4. Set the env vars, run migrations (`pnpm --filter @moonshot/api migrate`), start the API + admin.
5. Sign up a café → onboarding Menu step → **Connect my menu with Square**.
6. (Optional) Point a Sandbox webhook at a tunnel URL and set `SQUARE_WEBHOOK_NOTIFICATION_URL` to that same URL.

## Production cutover

Sandbox OAuth tokens **cannot** be refreshed or reused after switching to production credentials. Every café that connected in sandbox must **Reconnect Square** with a live seller account.

### Square Developer Console (Production mode)

1. Open your app → toggle **Production** (not Sandbox).
2. Copy the **Production Application ID** (`sq0idp-…`) and **Application Secret** — not the sandbox `sandbox-sq0idb-…` values.
3. **OAuth** → add redirect URL (HTTPS only):
   - `https://moonshotapi-production.up.railway.app/api/v1/admin/connect/square/return`
4. **Webhooks** → create an app-level subscription:
   - Notification URL: `https://moonshotapi-production.up.railway.app/api/v1/webhooks/square` (no trailing slash)
   - Events: `order.created`, `order.updated`, `order.fulfillment.updated`, `catalog.version.updated`, `oauth.authorization.revoked`
   - Copy the **Production** signature key (sandbox key will fail HMAC verification)

### Railway (`moonshot-api` service only)

Set or update these variables on the **production** environment:

| Variable | Production value |
|----------|------------------|
| `SQUARE_ENVIRONMENT` | `production` |
| `SQUARE_APPLICATION_ID` | Production Application ID from Dashboard |
| `SQUARE_APPLICATION_SECRET` | Production Application Secret |
| `SQUARE_OAUTH_REDIRECT_URL` | `https://moonshotapi-production.up.railway.app/api/v1/admin/connect/square/return` |
| `SQUARE_CONNECT_ADMIN_REDIRECT_URL` | `https://moonshot-admin-production.up.railway.app/onboarding/import-pos` |
| `SQUARE_WEBHOOK_NOTIFICATION_URL` | `https://moonshotapi-production.up.railway.app/api/v1/webhooks/square` |
| `SQUARE_WEBHOOK_SIGNATURE_KEY` | Production webhook signature key |

**Leave unchanged:** `POS_TOKEN_ENCRYPTION_KEY`, `JWT_SECRET`, `CRON_SECRET`, `DATABASE_URL`, `CORS_ORIGINS`.

Production authorize URLs use `https://connect.squareup.com` with `session=false` (forced seller sign-in). The SDK uses `SquareEnvironment.Production` automatically when `SQUARE_ENVIRONMENT=production`.

### Railway cron

Confirm a cron job calls these endpoints with `Authorization: Bearer ${CRON_SECRET}`:

- `POST /api/v1/internal/pos/refresh-tokens` — every **6–12 hours**
- `POST /api/v1/internal/pos/sync-catalogs` — daily
- `POST /api/v1/internal/orders/expire-stale` — hourly

### After deploy

1. Redeploy `moonshot-api` so env changes take effect.
2. Mark any existing sandbox connections for reconnect.

### Debugging OAuth return failures

The admin page `?squareConnect=error&reason=…` is seller-safe — it does **not** include Square’s error body.

| `reason` | Meaning |
|----------|---------|
| `access_denied` | Seller cancelled Square’s consent screen |
| `invalid_state` | Signed `state` JWT missing/expired (15m) or `JWT_SECRET` mismatch |
| `missing_code` | Square redirected without `code` |
| `token_incomplete` | ObtainToken succeeded but omitted access/refresh/merchant id |
| `merchant_in_use` | This Square `merchant_id` is already on another café. Query includes `otherCafe` (name) when known. |
| `exchange_failed` | ObtainToken or token persist threw — see API logs |

Railway (`@moonshot/api` runtime logs), look for:

```
[square-oauth] return_failed { cafeId, reason, statusCode, squareErrors, pgCode, constraint, message }
```

HTTP logs for `/admin/connect/square/return` are a 302 either way (success and failure). The structured `return_failed` line is the source of truth. OAuth `code` / `state` are redacted from `[http]` lines.

Railway **Postgres → Console** is a **bash** shell, not `psql`. Paste one line at a time (do not paste multi-line SQL directly into bash).

**Check current Square connections:**

```bash
psql "$DATABASE_URL" -c "SELECT cafe_id, merchant_id, status FROM pos_connections WHERE provider = 'square';"
```

**Mark active sandbox rows for reconnect** (one-shot):

```bash
psql "$DATABASE_URL" -c "UPDATE pos_connections SET status = 'needs_reauth', updated_at = NOW() WHERE provider = 'square' AND status = 'active';"
```

If `DATABASE_URL` is unset in the Postgres console, Railway usually still exposes Postgres vars — try:

```bash
psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "UPDATE pos_connections SET status = 'needs_reauth', updated_at = NOW() WHERE provider = 'square' AND status = 'active';"
```

(`PGPASSWORD` is set automatically in the Postgres service shell.)

Alternatively, open an interactive `psql` session first, then run SQL inside it:

```bash
psql "$DATABASE_URL"
```

At the `postgres=#` prompt:

```sql
UPDATE pos_connections
SET status = 'needs_reauth', updated_at = NOW()
WHERE provider = 'square' AND status = 'active';
```

Type `\q` to exit.

3. Sign up a new café (or use an existing one) → onboarding Menu step → **Connect my menu with Square** using a **live** Square seller account.
4. Verify: OAuth completes, menu imports, and `GET /admin/connect/square/status` shows `connected: true`.

### Verify token refresh cron

```bash
curl -X POST "https://moonshotapi-production.up.railway.app/api/v1/internal/pos/refresh-tokens" \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

Expect `{ "ok": true, "data": { "refreshed": N, ... } }`.

## Scopes requested

`MERCHANT_PROFILE_READ`, `ITEMS_READ`, `ORDERS_READ`, `ORDERS_WRITE`, `PAYMENTS_READ`.

## Still open

- **C&B cutover** — retire any hand-wired legacy token / per-location webhook and confirm no duplicate order events before claiming full release DoD.
