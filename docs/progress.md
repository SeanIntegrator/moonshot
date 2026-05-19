# Moonshot — Progress

_Last updated: May 2026_

## What we set out to do

Establish a **thin end-to-end happy path** between order-ahead, API, and KDS so a real order appears live in the kitchen and completion feedback reaches the customer, including on Railway.

---

## What is now working in production

### Order creation paths (`POST /api/v1/orders`)

- **`pay_in_store`** (when `features.order_ahead.paymentProvider` is `pay_in_store`): **`confirmed` / `unpaid`**, **`kds:order:new`** immediately, **modifier validation** against `menu_items.modifier_groups`, FIFO **pickup ETA** + socket broadcasts.
- **`stripe`** (default in seed cafés): requires **Stripe Connect** ready (`chargesEnabled`). Order created **`pending` / `unpaid`**, response includes **`checkoutUrl`**. **`checkout.session.completed`** webhook confirms **`paid` / `confirmed`**, then **KDS** + ETA. Guests get **`trackingToken`** when `JWT_SECRET` is set and `user_id` is null.

### Modifier support

- Client sends `{ groupId, optionId }[]` per line; server resolves names/prices, snapshots **`NormalisedOrderLineModifier`** (group + option dimensions) on `order_items.modifiers`.

### Stripe Connect + webhooks

- Admin **`POST /admin/payments/stripe/onboarding-link`** + **`GET /admin/payments/stripe/status`**, Express connected accounts, **direct Checkout** on the connected account.
- **`POST /api/v1/webhooks/stripe`** with signature verification + **`webhook_events`** idempotency; **`payment_sessions`** table stores checkout metadata.

### KDS + customer realtime

- KDS JWT **90 days**; HTTP **401** clears session in the KDS PWA (`SESSION_EXPIRED`).
- **`kds:eta:updated`** and **`customerEtaUpdated`** emitted after queue changes.
- **`customerReviewEligible`** may fire after the third **on-time** completed app order when review nudge is enabled (simple counter MVP on `cafe_users`).

### Loyalty MVP + ledger

- On KDS complete, signed-in **app** orders increment **`total_orders`**, append **`loyalty_transactions`** (**`stamp_earned`**) when loyalty is enabled, issue **`loyalty_rewards`** + reset stamp cache at threshold, and increment **`on_time_completed_orders`** when completed within **pickup_time + 2 minutes** (if a pickup time was set).

### Operator tooling

- **Admin** dashboard: order-ahead + KDS settings, menu PATCH edits, **Stripe onboarding card**.

### CORS / origins

- **`CORS_ORIGINS`** allowlist for Express + Socket.io in production; see `apps/moonshot-api/.env.example` for **Stripe-related env vars** (API only).

### Documentation layout

- **`docs/README.md`** hub; **`docs/pos-normalisation.md`** for future POS providers; **`docs/architecture/realtime.md`** updated for ETA + review event.

### Deployed on Railway

| Service | URL |
|---|---|
| `moonshot-api` | `moonshot-api-production.up.railway.app` |
| `moonshot-kds` | `moonshot-kds-production.up.railway.app` |
| `moonshot-order-ahead` | `moonshot-order-ahead-production.up.railway.app` |
| `moonshot-admin` | `moonshot-admin-production.up.railway.app` |

Set **`CORS_ORIGINS`** to the three HTTPS front-end origins (comma-separated). Add Stripe keys + webhook URL to **`moonshot-api`**. Replace with custom domains by updating env vars only.

---

## Known snags

1. **Seed cafés default to `stripe`** — `POST /orders` fails with *payments not ready* until Stripe onboarding completes; switch to **`pay_in_store`** in admin for local pay-in-store-only dev.
2. **Order-ahead UI is routing-complete for production shells** — Home / Order / Checkout / Order detail / Rewards / Profile with **`CartProvider`**, **`ActiveOrdersProvider`**, **`useLoyalty`**, and **`src/api/*`** wrappers; polish is ongoing.
3. **Stripe refunds on cancel** — customer cancel updates **`orders.status`** only; **`refundPending: true`** signals paid orders until Stripe refund work ships.
4. **Stripe incremental / merge checkout (F3)** — not implemented; only initial **Checkout Session** per order.
5. **Admin** — still no invite flow or full menu create/delete UI; Stripe card is minimal.
6. **Bootstrap uses sync scrypt** — fine for CLI only.

---

## Next steps (see `docs/roadmap.md`)

1. Order-ahead + KDS **UI** polish (checkout redirect, modifier pickers, ETA display).
2. **Order merge** + incremental Stripe sessions.
3. **POS adapter implementations** (Square, etc.) using [pos-normalisation.md](pos-normalisation.md).
4. Admin **invites**, full menu CRUD, audit trail.
5. **Feedback persistence** (`feedback_responses`) and richer review flows.

---

## Related docs

- [docs/README.md](README.md) — documentation index
- [architecture/realtime.md](architecture/realtime.md) — Socket auth model
- [current/http-surface.md](current/http-surface.md) — routes + CORS
- [dataflow-sequences.md](dataflow-sequences.md) — sequences
- [schema-draft.md](schema-draft.md) — schema
- [pos-normalisation.md](pos-normalisation.md) — future POS mapping
