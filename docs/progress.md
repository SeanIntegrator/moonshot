# Moonshot — Progress

_Last updated: August 2026_

Concise changelog of what is **shipped now**. For routes and sequences see [current/http-surface.md](current/http-surface.md) and [current/flows.md](current/flows.md).

---

## Shipped

### Order-ahead → API → KDS happy path

- **`POST /orders`**: `pay_in_store` (immediate KDS) or **`stripe`** Checkout (KDS after webhook / checkout-session recovery).
- Modifier validation + snapshots on `order_items.modifiers`; FIFO pickup ETA floored by `requested_pickup_not_before`.
- Customer **`/customer`** sockets + polling; KDS complete → loyalty + ETA; guest **`trackingToken`**.

### Stripe Connect + checkout

- Admin Connect onboarding link / status / return+refresh callbacks.
- **`POST /webhooks/stripe`** (`checkout.session.completed`, `account.updated`) with `webhook_events` idempotency.
- Multi-tenant return URLs via **`ORDER_AHEAD_BASE_URL`**; recovery via **`GET /orders/checkout-session/:sessionId`**.
- Auto-switch café to `paymentProvider: stripe` when Connect `chargesEnabled`.

### Square POS (OAuth, catalog, webhooks)

- Admin **Square OAuth** (`/admin/connect/square/*`); tokens encrypted in **`pos_connections`**.
- Onboarding **menu-pos-import** + Admin **`POST /admin/menu/sync-pos`**; catalog webhooks + daily safety cron (`/internal/pos/sync-catalogs`).
- Token refresh cron (`/internal/pos/refresh-tokens`).
- **`POST /webhooks/square`** → signature verify → catalog debounce sync and/or order normalise → **`persistPosOrderEvent`** → KDS emit.
- Manual POS adapter still available for template-only cafés.

### KDS Flow board

- **Tailwind v4 + shadcn** Flow UI (drinks/food rows, chips, timers, allergens) — not a thin skeleton.
- Status advance (`preparing` / `ready`), ETA stretch, **`GET /kds/config`**.
- **Recent orders** (`GET /kds/orders/recent`) + **recall** (`POST …/recall`, `…/recall-last`).

### Menu & café ops

- Menu CRUD, images (upload / default / media proxy), **modifier groups**, **menu sections** (hierarchy + POS category ids), **drink archetypes**.
- Opening hours (`cafes.hours`); Admin settings PATCH for features / KDS config.

### Loyalty

- Ledger + punch card on KDS complete; redeem routes; order-ahead **`LoyaltyProvider`**.
- New self-service cafés: **loyalty enabled by default** (10 stamps → free drink).

### Self-service onboarding + theme

- Marketing → admin signup → wizard (KDS user, Square or template menu, optional Stripe).
- Order-ahead **theme system**: structural + café packs (`heritage`, etc.), radii, webfonts, `cafeLayout`.

### Shared packages & realtime

- Workspaces: **`@moonshot/types`**, **`@moonshot/domain`**, **`@moonshot/web-runtime`**.
- Socket.io namespaces: **`/kds`**, **`/customer`**, **`/admin`**.

### Deployed on Railway

| Service | Notes |
|---|---|
| `moonshot-api` | HTTP + sockets |
| `moonshot-kds` | Flow board PWA shell |
| `moonshot-order-ahead` | Customer app |
| `moonshot-admin` | Owner console |
| `moonshot-marketing` | Public marketing / signup entry |

Set **`CORS_ORIGINS`** to frontend HTTPS origins. Stripe + Square secrets on **`moonshot-api`** only.

---

## Known snags

1. Seed / Stripe cafés fail `POST /orders` until Connect is ready (or switch to `pay_in_store`).
2. Stripe cancel does not refund — paid → `refundPending: true`.
3. No incremental / merge Stripe checkout (F3).
4. Admin invites, audit trail, and café theme editor still missing.
5. Feedback is socket eligibility MVP only — no `feedback_responses` HTTP yet.

---

## Next

1. Stripe **refunds** + optional **order merge** / incremental sessions.
2. KDS **hold**, synced line made-state, `layout.columns` grouping, preparing/ready chrome polish.
3. Feedback persistence + order-ahead review drawer.
4. Admin invites / audit / theme editor.
5. C&B production cutover verification (OAuth-only, no duplicate POS events).

---

## Related docs

- [docs/README.md](README.md)
- [architecture/realtime.md](architecture/realtime.md)
- [current/http-surface.md](current/http-surface.md)
- [current/flows.md](current/flows.md)
- [schema-draft.md](schema-draft.md)
- [pos-normalisation.md](pos-normalisation.md)
- [square-oauth.md](square-oauth.md)
