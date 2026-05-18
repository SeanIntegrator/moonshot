# Postgres schema (Phase 1 + planned v2)

The repo now has a Phase 1 migration at `apps/moonshot-api/migrations/sql/001_initial_schema.sql`. That migration creates `cafes`, `users`, `cafe_users`, and `menu_items`, and seeds the `clay-and-bean` café plus one menu item.

Phase 2 migration `apps/moonshot-api/migrations/sql/002_orders_schema.sql` (wrapper `apps/moonshot-api/migrations/1734900000000_orders_schema.cjs`) adds `orders` and `order_items` with CHECK constraints and indexes aligned with `@moonshot/types`.

Phase 3 migration `apps/moonshot-api/migrations/sql/003_kds_users_schema.sql` (wrapper `apps/moonshot-api/migrations/1735000000000_kds_users_schema.cjs`) adds `kds_users` for café-scoped KDS device login (hashed passwords).

Phase 4 migration `apps/moonshot-api/migrations/sql/004_admin_users_schema.sql` (wrapper `apps/moonshot-api/migrations/1735100000000_admin_users_schema.cjs`) adds pre-seeded café admin accounts. Invite columns exist for a future onboarding flow, but runtime login currently uses pre-created credentials.

Phase 5 migration `apps/moonshot-api/migrations/sql/005_payment_webhook_schema.sql` (wrapper `apps/moonshot-api/migrations/1735200000000_payment_webhook_schema.cjs`) adds **`payment_sessions`** and **`webhook_events`** for Stripe Checkout + Connect webhook idempotency.

The later sections of this document (`loyalty_transactions`, `feedback_responses`, additional POS tables, etc.) remain **planned v2** shapes beyond what migrations 1–5 create today.

## Conventions

- Primary keys: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Timestamps: `created_at`, `updated_at` `TIMESTAMPTZ` where mutable
- Money: integer **minor units** (`*_minor`) + `currency TEXT` ISO 4217
- Soft config: `JSONB` on `cafes` for POS credentials, payment config, `features`, `kds_config`, theme overrides

---

## `cafes`

Implemented in Phase 1.

| Column             | Type        | Notes |
| ------------------ | ----------- | ----- |
| id                 | UUID        | PK |
| name               | TEXT        | |
| slug               | TEXT        | UNIQUE, subdomain / URL |
| pos_provider       | TEXT        | `square` \| `epos_now` \| `sumup` \| `lightspeed` \| `manual` |
| pos_config         | JSONB       | provider secrets / ids |
| payment_provider   | TEXT        | default `stripe` |
| payment_config     | JSONB       | Stripe Connect / keys per café |
| features           | JSONB       | `CafeFeatures` shape |
| theme_id           | TEXT        | base template id |
| theme_overrides    | JSONB       | deep-merge overrides |
| kds_config         | JSONB       | milk colours, timer thresholds, **eta: `{ base_prep_minutes, per_item_minutes }`**, layout |
| timezone           | TEXT        | default `Europe/London` |
| owner_feedback_email | TEXT      | optional; used for negative-review path `mailto:` |
| created_at         | TIMESTAMPTZ | |

**Indexes:** `slug UNIQUE`

---

## `users`

Implemented in Phase 1.

| Column       | Type        | Notes |
| ------------ | ----------- | ----- |
| id           | UUID        | PK |
| google_id    | TEXT        | UNIQUE nullable |
| email        | TEXT        | UNIQUE NOT NULL |
| display_name | TEXT        | |
| avatar_url   | TEXT        | |
| created_at   | TIMESTAMPTZ | |

---

## `cafe_users`

Membership + per-café loyalty and review-prompt state.

Implemented in Phase 1. The review and loyalty counters exist, but the order/loyalty/review flows that update them are not implemented yet.

| Column                     | Type        | Notes |
| -------------------------- | ----------- | ----- |
| cafe_id                    | UUID        | FK → cafes, part of PK |
| user_id                    | UUID        | FK → users, part of PK |
| loyalty_stamps             | INTEGER     | denormalised cache optional; ledger is source of truth |
| total_orders               | INTEGER     | optional analytics |
| on_time_completed_orders   | INTEGER     | **increments only** for `source = app` when S4 on-time rule passes |
| review_prompt_state        | TEXT        | `not_shown` \| `shown_positive` \| `shown_negative` \| `dismissed` |
| first_visit                | TIMESTAMPTZ | |

**PK:** `(cafe_id, user_id)`  
**Indexes:** `(cafe_id, user_id)` already PK

---

## `menu_items`

Synced from POS adapter or edited via manual adapter / admin.

Implemented in Phase 1. Current runtime uses the manual POS adapter, which reads available rows from this table. Admin menu writes exist in the API and are gated by either admin JWT or Google/session JWT plus `MENU_ADMIN_EMAILS`. The admin UI currently edits existing item price, availability, and modifier option prices; full create/delete menu UI remains planned.

| Column           | Type        | Notes |
| ---------------- | ----------- | ----- |
| id               | UUID        | PK internal |
| cafe_id          | UUID        | FK NOT NULL |
| pos_item_id      | TEXT        | nullable for manual-only lines |
| name             | TEXT        | |
| description      | TEXT        | |
| price_minor      | INTEGER     | |
| currency         | TEXT        | default `GBP` |
| category         | TEXT        | hot_drinks, cold_drinks, food, extras |
| subcategory      | TEXT        | nullable |
| image_url        | TEXT        | |
| emoji            | TEXT        | |
| is_available      | BOOLEAN     | |
| tags             | TEXT[]      | |
| modifier_groups  | JSONB       | `NormalisedModifierGroup[]` |
| sort_order       | INTEGER     | |
| synced_at        | TIMESTAMPTZ | |
| created_at       | TIMESTAMPTZ | |

**Unique:** `(cafe_id, pos_item_id)` where `pos_item_id IS NOT NULL` (partial unique index)

---

## `kds_users`

Café-scoped credentials for KDS tablets (separate from Google `users`).

Implemented in Phase 3 (`003_kds_users_schema.sql`). Passwords are stored as opaque **`scrypt$...`** hashes from the API; never store or log plaintext passwords.

| Column         | Type        | Notes |
| -------------- | ----------- | ----- |
| id             | UUID        | PK |
| cafe_id        | UUID        | FK → cafes |
| username       | TEXT        | unique per café |
| password_hash  | TEXT        | server-side hash only |
| display_name   | TEXT        | optional label |
| is_active      | BOOLEAN     | |
| last_login_at  | TIMESTAMPTZ | |
| created_at     | TIMESTAMPTZ | |
| updated_at     | TIMESTAMPTZ | |

**Unique:** `(cafe_id, username)`

---

## `admin_users`

Pre-seeded café admin credentials for the admin app.

Implemented in Phase 4 (`004_admin_users_schema.sql`). Passwords use the same opaque **`scrypt$...`** hash format as KDS users. Invite fields are reserved for future onboarding and are not wired to an email/invite flow yet.

| Column             | Type        | Notes |
| ------------------ | ----------- | ----- |
| id                 | UUID        | PK |
| cafe_id            | UUID        | FK → cafes |
| email              | TEXT        | unique per café |
| password_hash      | TEXT        | server-side hash only |
| display_name       | TEXT        | optional label |
| is_active          | BOOLEAN     | |
| invite_token       | TEXT        | future invite flow, unique nullable |
| invite_expires_at  | TIMESTAMPTZ | future invite flow |
| invite_accepted_at | TIMESTAMPTZ | future invite flow |
| last_login_at      | TIMESTAMPTZ | |
| created_at         | TIMESTAMPTZ | |
| updated_at         | TIMESTAMPTZ | |

**Unique:** `(cafe_id, email)`; additional lower-email index supports login lookup.

---

## `orders`

Implemented in Phase 2 (`002_orders_schema.sql`). Guest pay-in-store creation is exposed as `POST /api/v1/orders` (see `docs/dataflow-sequences.md` S3). KDS list/complete and Socket.io fan-out are implemented after KDS login; **customer tracking** uses namespace `/customer` with JWT validation (see `docs/architecture/realtime.md`). Stripe/POS webhooks remain planned.

| Column               | Type        | Notes |
| -------------------- | ----------- | ----- |
| id                   | UUID        | PK |
| cafe_id              | UUID        | FK NOT NULL |
| user_id              | UUID        | FK nullable (walk-in) |
| pos_order_id         | TEXT        | nullable; **dedup** with `cafe_id` |
| customer_name        | TEXT        | NOT NULL |
| notes                | TEXT        | order-level note |
| total_minor          | INTEGER     | |
| currency             | TEXT        | default `GBP` |
| order_type           | TEXT        | `takeaway` \| `eat_in` |
| source               | TEXT        | `app` \| `pos` \| `whatsapp` \| `web` |
| status               | TEXT        | pending → confirmed → preparing → ready → completed \| cancelled |
| payment_status       | TEXT        | unpaid, paid, refunded, … |
| quoted_pickup_time   | TIMESTAMPTZ | what we promised at checkout / last ETA quote |
| pickup_time          | TIMESTAMPTZ | **live** ETA (auto-updated) |
| completed_at         | TIMESTAMPTZ | set when KDS / flow completes |
| edit_token           | UUID        | secret for `PATCH` merge flow |
| parent_order_id      | UUID        | FK → orders nullable; **audit trail** for add-on checkouts linked to same basket |
| stripe_checkout_session_id | TEXT  | latest or initial session id (nullable) |
| created_at           | TIMESTAMPTZ | |
| updated_at           | TIMESTAMPTZ | |

**No `allergens` on order** — moved to line items.

**Indexes:**

- `(cafe_id, status, created_at DESC)` for KDS open queue (`idx_orders_cafe_status_created`)
- `UNIQUE (cafe_id, pos_order_id)` where `pos_order_id IS NOT NULL` (`orders_cafe_pos_order_unique`)
- `(user_id, created_at DESC)` for customer history (`idx_orders_user_created`)

**Checks:** `total_minor >= 0`; `order_type`, `source`, `status`, `payment_status` constrained to the enums used in `@moonshot/types`.

---

## `order_items`

Implemented in Phase 2 (`002_orders_schema.sql`).

| Column            | Type        | Notes |
| ----------------- | ----------- | ----- |
| id                | UUID        | PK |
| order_id          | UUID        | FK ON DELETE CASCADE |
| menu_item_id      | UUID        | FK nullable if one-off |
| item_name         | TEXT        | denormalised |
| quantity          | INTEGER     | default 1 |
| unit_price_minor  | INTEGER     | |
| modifiers         | JSONB       | selected options names + prices + internal ids |
| allergens         | TEXT[]      | **per-item** |
| notes             | TEXT        | per-line |
| created_at        | TIMESTAMPTZ | |

**Derived:** order-level allergy summary for KDS = union of line `allergens` at read time (not stored).

**Indexes:** `(order_id)` (`idx_order_items_order_id`); `(menu_item_id)` (`idx_order_items_menu_item_id`).

**Checks:** `quantity > 0`; `unit_price_minor >= 0`.

---

## `payment_sessions`

Normalises checkout sessions per provider (Stripe first).

**Implemented** in migration `apps/moonshot-api/migrations/sql/005_payment_webhook_schema.sql`.

| Column              | Type        | Notes |
| ------------------- | ----------- | ----- |
| id                  | UUID        | PK |
| order_id            | UUID        | FK |
| cafe_id             | UUID        | FK denormalised for reporting |
| provider            | TEXT        | `stripe` |
| session_id          | TEXT        | Stripe Checkout session id |
| payment_intent_id   | TEXT        | nullable |
| amount_minor        | INTEGER     | |
| currency            | TEXT        | |
| type                | TEXT        | `initial` \| `incremental` \| … |
| created_at          | TIMESTAMPTZ | |

**Indexes:** `(order_id)`, `(session_id UNIQUE)`

---

## `loyalty_transactions` (ledger)

Append-only stamps / rewards (replaces or supplements simple `loyalty_stamps` table from master doc).

Planned. Not created by the current migration.

| Column          | Type        | Notes |
| --------------- | ----------- | ----- |
| id              | UUID        | PK |
| cafe_id         | UUID        | FK |
| user_id         | UUID        | FK |
| order_id        | UUID        | FK nullable |
| transaction_type| TEXT        | `stamp_earned` \| `reward_redeemed` \| … |
| stamps_delta    | INTEGER     | |
| metadata        | JSONB       | |
| created_at      | TIMESTAMPTZ | |

---

## `loyalty_rewards` (optional)

As in master context §6.2 — reward inventory / expiry if product needs it.

Planned. Not created by the current migration.

---

## `feedback_responses`

Stores thumbs + optional owner email + Google follow-through.

Planned. Not created by the current migration.

| Column              | Type        | Notes |
| ------------------- | ----------- | ----- |
| id                  | UUID        | PK |
| cafe_id             | UUID        | FK |
| user_id             | UUID        | FK |
| order_id            | UUID        | FK nullable (prompt may correlate to last completed) |
| sentiment           | TEXT        | `positive` \| `negative` |
| owner_message       | TEXT        | nullable; negative path private feedback |
| opened_google_review| BOOLEAN     | client hint optional |
| created_at          | TIMESTAMPTZ | |

---

## `events`, `promotions`

As master §6.2 — unchanged intent.

Planned. Not created by the current migration.

---

## Webhook idempotency

**Implemented** as `webhook_events` in `apps/moonshot-api/migrations/sql/005_payment_webhook_schema.sql`.

| Table | Purpose |
| ----- | ------- |
| `webhook_events` | `(provider, event_id)` UNIQUE processed log |

Prevents double-processing Stripe webhook deliveries.
