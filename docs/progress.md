# Moonshot — Progress

_Last updated: August 2026_

Concise changelog of what is **shipped now**. For launch workstreams see [architecture/roadmap.md](architecture/roadmap.md). For routes and sequences see [current/http-surface.md](current/http-surface.md) and [current/flows.md](current/flows.md).

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

- **Tailwind v4 + shadcn** Flow UI (drinks/food rows, chips, timers, allergens) — installable SPA (`display: standalone` + Apple meta; no SW).
- Status advance (`preparing` / `ready`), ETA stretch, **`GET /kds/config`**.
- **Recent orders** (`GET /kds/orders/recent`) + **recall** (`POST …/recall`, `…/recall-last`).
- Line-level free-text notes render on drink/food rows (plain off-white, right-aligned with allergens); **order-level** notes also show on the live `OrderCard`.
- New-order chime + repeating overdue alarm (`kdsConfig.audio`); login unlocks WebAudio; header mute / **Sound off** indicator.

### Menu & café ops

- Menu CRUD, images (upload / default / media proxy), **modifier groups**, **menu sections** (hierarchy + POS category ids), **drink archetypes**.
- Opening hours (`cafes.hours`); Admin settings PATCH for features / KDS config.
- Admin HTTP client is split under `lib/adminApi/*` (`admin-api.ts` is a thin barrel).

### Loyalty

- Ledger + punch card on KDS complete; redeem routes; order-ahead **`LoyaltyProvider`**.
- New self-service cafés: **loyalty enabled by default** (10 stamps → free drink).
- Stamp card on Home **hot-updates** on KDS complete via optional `loyalty` on `customerOrderCompleted` (Workstream 1 done).

### Self-service onboarding + theme

- Marketing → admin signup → wizard (KDS user, Square or template menu, optional Stripe).
- Order-ahead **theme system**: structural + café packs (`heritage`, etc.), radii, webfonts, `cafeLayout`.
- Theme **read** path shipped (`theme_id` / `theme_overrides`); Admin **write** path and logo upload not yet (Workstream 4).

### Shared packages & realtime

- Workspaces: **`@moonshot/types`**, **`@moonshot/domain`**, **`@moonshot/web-runtime`** (`RealtimeConnection` + `@moonshot/web-runtime/react`).
- Socket.io namespaces: **`/kds`**, **`/customer`**, **`/admin`**. Tuned heartbeats + connection state recovery; KDS reconnects without a board flash.

### Deployed on Railway

| Service | Notes |
|---|---|
| `moonshot-api` | HTTP + sockets |
| `moonshot-kds` | Flow board SPA — Add to Home Screen on iPad (`standalone`) |
| `moonshot-order-ahead` | Customer PWA (manifest + SW; `/runtime-config.js` NetworkOnly) |
| `moonshot-admin` | Owner console (single-scroll dashboard) |
| `moonshot-marketing` | Public marketing / signup entry |

Set **`CORS_ORIGINS`** to frontend HTTPS origins. Stripe + Square secrets on **`moonshot-api`** only.

---

## Known snags

1. Seed / Stripe cafés fail `POST /orders` until Connect is ready (or switch to `pay_in_store`).
2. Stripe cancel does not refund — paid → `refundPending: true`.
3. No incremental / merge Stripe checkout (F3).
4. **Review nudge**: API may emit `customerReviewEligible` but order-ahead has no UI; Phase A also sets `review_prompt_state = 'shown_positive'` at emit time (burns eligibility before the modal ships — roadmap WS2).
5. Admin invites, audit trail, and café theme/logo editor still missing (roadmap WS3–WS4).

---

## Next

Tackle as planned sessions per [architecture/roadmap.md](architecture/roadmap.md):

1. **WS2** — Review nudge single-CTA modal + `eligible` state + Admin `reviewUrl`.
2. **WS3** — Admin dashboard redesign (unified brand, sidebar, primitives).
3. **WS4** — Café branding write path (theme picker, colour overrides, logo).
4. **WS7** — C&B OAuth cutover, hardening, live barista shift, retire v0.1.

Parked (post-launch): Stripe refunds, Redis socket adapter, KDS hold / line made-state, Lightspeed, Capacitor wrapper.

---

## Related docs

- [docs/README.md](README.md)
- [architecture/roadmap.md](architecture/roadmap.md)
- [architecture/realtime.md](architecture/realtime.md)
- [current/http-surface.md](current/http-surface.md)
- [current/flows.md](current/flows.md)
- [feedback-prompt-flow.md](feedback-prompt-flow.md)
- [schema-draft.md](schema-draft.md)
- [pos-normalisation.md](pos-normalisation.md)
- [square-oauth.md](square-oauth.md)
