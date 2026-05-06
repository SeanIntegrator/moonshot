# Moonshot — Progress

_Last updated: May 2026_

## What we set out to do

Establish a **thin end-to-end happy path** between order-ahead, API, and KDS so a real order appears live in the kitchen and completion feedback reaches the customer, including on Railway.

---

## What is now working in production

### Guest + signed-in pay-in-store orders

- Order-ahead (`/menu`) loads menu, basket, **Place order** → `POST /api/v1/orders`.
- **Optional `Authorization`** from Google sign-in sets **`orders.user_id`**; otherwise guest checkout.
- **Guest** responses include **`trackingToken`** (short-lived JWT) for Socket subscribe when `JWT_SECRET` is set.
- Server validates lines against `menu_items`, persists **`confirmed` / `unpaid`**, emits **`kds:order:new`**.

### KDS authentication + live board

- Café-scoped device login, JWT with `purpose: 'kds'`, `kds_users` + bootstrap script.
- Socket namespace **`/kds`**, `kds:event`, HTTP list/complete.
- 90s periodic HTTP reconcile if the socket drops.

### Customer completion push

- Socket namespace **`/customer`**: subscribe with **`authToken`** = `trackingToken` **or** session JWT; order must match token rules.
- **`customerOrderCompleted`** when KDS marks done.

### CORS / origins

- **`CORS_ORIGINS`** allowlist for Express + Socket.io in production; document local dev fallbacks in `apps/moonshot-api/.env.example`.

### Documentation layout

- **`docs/README.md`** hub; **`docs/architecture/`**, **`docs/current/`**, **`docs/roadmap.md`** split “stable / today / target”.

### Deployed on Railway

| Service | URL |
|---|---|
| `moonshot-api` | `moonshot-api-production.up.railway.app` |
| `moonshot-kds` | `moonshot-kds-production.up.railway.app` |
| `moonshot-order-ahead` | `moonshot-order-ahead-production.up.railway.app` |
| `moonshot-admin` | `moonshot-admin-production.up.railway.app` (placeholder) |

Set **`CORS_ORIGINS`** to the three HTTPS front-end origins (comma-separated). Replace with custom domains by updating that env var only.

---

## Known snags

1. **Guest orders always `unpaid`** — intentional until Stripe (barista collects in person).
2. **Order-ahead UI is skeletal** — design system WIP; tracking chips are placeholder UX.
3. **No modifier support** — API rejects non-empty modifier arrays.
4. **KDS JWT expiry** — poor UX on expiry; re-login not polished.
5. **Bootstrap uses sync scrypt** — fine for CLI only.

---

## Next steps (see `docs/roadmap.md`)

1. Stripe checkout + webhooks.
2. Modifier validation + UI.
3. Pickup ETA + broadcast events.
4. KDS session recovery.
5. Admin menu UI, loyalty/review, POS adapter.

---

## Related docs

- [docs/README.md](README.md) — documentation index
- [architecture/realtime.md](architecture/realtime.md) — Socket auth model
- [current/http-surface.md](current/http-surface.md) — routes + CORS
- [dataflow-sequences.md](dataflow-sequences.md) — sequences
- [schema-draft.md](schema-draft.md) — schema
