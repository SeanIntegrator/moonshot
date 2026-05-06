# Moonshot — Progress

_Last updated: May 2026_

## What we set out to do

Establish a **thin end-to-end happy path** between the three active apps — order-ahead, API, and KDS — so that a real order placed by a customer appears live on the kitchen display and can be marked done, all the way through production on Railway.

---

## What is now working in production

### Guest pay-in-store order flow

The order-ahead PWA (`/menu`) has a working basket. A customer can:

1. Browse the menu (fetched from API → Postgres).
2. Add items, enter their name and order type (takeaway / eat in).
3. Tap **Place order** — this calls `POST /api/v1/orders`.
4. The API validates items against `menu_items`, derives prices server-side, and persists `orders` + `order_items` as `confirmed / unpaid`.
5. A confirmation card shows order id and status.

Modifiers are intentionally not supported yet (the API rejects non-empty modifier arrays).

### KDS authentication

KDS devices authenticate with a café-scoped username and password, completely separate from Google/customer auth:

- `kds_users` table in Postgres (migration 003) stores a `scrypt`-hashed password per café/username pair.
- `POST /api/v1/kds/auth/login` verifies credentials and returns a **KDS JWT** (`purpose: 'kds'`, carries `cafeId` and `cafeSlug`).
- The KDS JWT is stored in `sessionStorage` — never committed to code or config.
- A bootstrap script (`pnpm --filter @moonshot/api bootstrap:kds-user`) creates/updates credentials from env vars only — no plaintext passwords or hashes in the codebase.
- `requireKdsAuth` middleware rejects tokens that are not purpose-scoped to `'kds'`, and customer `requireAuth` middleware rejects KDS tokens.

### KDS live board (Socket.io)

After login the KDS app:

1. Fetches open orders via `GET /api/v1/kds/orders`.
2. Opens a **Socket.io** connection to the API using the KDS JWT (`auth.token`).
3. Joins `kds:cafe:{cafeId}` automatically on connect.
4. Receives `kds:order:new` the moment an order is placed by a customer — no polling, no page refresh.
5. Displays order cards (customer name, items, type, price, time).
6. **Done** button calls `POST /api/v1/kds/orders/:orderId/complete`, which marks the order `completed` in Postgres and emits `kds:order:removed` to the room — card disappears instantly on all connected KDS screens.

A 90-second background reconciliation sync runs as a safety net in case the socket drops.

### Deployed on Railway

All four services are live on Railway (`production` environment):

| Service | URL |
|---|---|
| `moonshot-api` | `moonshot-api-production.up.railway.app` |
| `moonshot-kds` | `moonshot-kds-production.up.railway.app` |
| `moonshot-order-ahead` | `moonshot-order-ahead-production.up.railway.app` |
| `moonshot-admin` | `moonshot-admin-production.up.railway.app` (placeholder) |

`VITE_API_URL` is set correctly on both frontend services so the Vite bundles point at the right API origin.

---

## Known snags

### 1. Docs partially stale
`dataflow-high-level.md` still shows KDS and Socket.io in the "planned" topology box and describes the KDS as a placeholder shell. The text body was updated but the Mermaid diagram was not. Low priority but worth fixing before sharing the docs externally.

### 2. `dataflow-sequences.md` "planned" list not pruned
Items like "Public KDS HTTP surface and Socket.io (`kds:event`) after KDS login" are still in the planned list even though they are now implemented.

### 3. Guest orders are always `unpaid`
The current pay-in-store flow creates orders with `payment_status = 'unpaid'`. There is no payment step — the barista collects payment in person. This is intentional for phase 1 but means the order-ahead app has no payment flow yet and the KDS shows `unpaid` on every card.

### 4. Order-ahead confirmation is minimal
After placing an order the customer sees a small dismissible card with the order id and status. There is no order tracking page, no live status update pushed to the customer, and no way to view past orders.

### 5. No modifier support
Menu items with modifier groups (e.g. milk choice, size) cannot be ordered. The API explicitly rejects non-empty modifier arrays. The modifier data exists in `menu_items.modifier_groups` — it just isn't wired to the order flow yet.

### 6. KDS token expiry not handled gracefully
KDS JWTs are issued with a 30-day expiry. If the token expires the board goes blank and shows a socket error. There is no silent refresh or redirect back to login.

### 7. Bootstrap password caveat
The bootstrap script uses `scryptSync` which is synchronous and will block the event loop briefly on the server. Fine for a one-off CLI script but worth noting if it ever moves into a request handler.

---

## Next steps

Listed roughly in priority order for getting to a shippable product.

### 1. Stripe checkout (core revenue path)
Replace the `unpaid` guest flow with Stripe Checkout:

- `POST /api/v1/orders` creates an order as `pending` and opens a Stripe Checkout session.
- Stripe webhook `checkout.session.completed` flips the order to `confirmed / paid` and emits `kds:order:new`.
- Order-ahead redirects to the Stripe-hosted payment page; on return shows confirmation.

See `docs/dataflow-sequences.md` F2 for the planned sequence.

### 2. Customer-side socket (order tracking)
After payment, the customer needs live status updates:

- Order-ahead subscribes to a customer socket room using the Google JWT.
- API emits `customerOrderCompleted` when KDS marks done.
- Customer sees their order status update without polling.

See `docs/dataflow-sequences.md` F4 for the planned KDS → customer flow.

### 3. Modifier support
Wire `modifier_groups` from `menu_items` into the order-ahead basket and API validation:

- Add modifier selection UI to the menu item (size, milk, etc.).
- API validates selected options against `modifier_groups` and applies price deltas.
- KDS card shows selected modifiers per line.

### 4. KDS token refresh / session recovery
When the KDS JWT expires or the socket loses auth, redirect cleanly back to the login form rather than showing an error state.

### 5. Pickup ETA
Compute and display an estimated pickup time on both the KDS card and the customer confirmation screen. Formula and config are drafted in `docs/dataflow-sequences.md` F5 and `docs/schema-draft.md` (`cafes.kds_config.eta`).

### 6. Admin UI — menu management
Menu CRUD (`POST / PATCH / DELETE /api/v1/menu`) is already implemented in the API and gated by `MENU_ADMIN_EMAILS`. The `moonshot-admin` app is still a placeholder — wiring the existing API routes to a UI is the next step there.

### 7. Loyalty and review prompt
`cafe_users` already has `loyalty_stamps`, `on_time_completed_orders`, and `review_prompt_state` columns. The flows that increment them (KDS completion → loyalty credit → review drawer after 3 on-time orders) are designed in `docs/feedback-prompt-flow.md` but not yet implemented.

### 8. POS adapter (Square)
Walk-in POS orders are planned to flow in via `payment.created` webhook → Square API → normalise → upsert Postgres → emit `kds:order:new`. See `docs/dataflow-sequences.md` F1.

---

## Related docs

- [dataflow-high-level.md](dataflow-high-level.md) — system topology and current HTTP surface.
- [dataflow-sequences.md](dataflow-sequences.md) — sequence diagrams per flow (implemented and planned).
- [schema-draft.md](schema-draft.md) — Postgres schema (phases 1–3 implemented, later tables planned).
- [feedback-prompt-flow.md](feedback-prompt-flow.md) — review prompt UX design.
