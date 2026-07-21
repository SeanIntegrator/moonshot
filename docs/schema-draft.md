# Postgres schema (Phase 1 + planned v2)

Migrations live under `apps/moonshot-api/migrations/` (node-pg-migrate wrappers + `sql/` sources). Through **013** (`orders.requested_pickup_not_before`) the live schema covers cafés, users/memberships, menu + modifier library, orders/items, KDS users, admin users, payment/webhook tables, and loyalty ledger. Self-service **admin onboarding** provisions café + admin + optional KDS user + template menu without a separate schema phase.

Sections below for **`feedback_responses`**, additional POS tables, etc. remain **planned v2** beyond what migrations create today.

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
| loyalty_display_counter | INTEGER  | **Phase 10** — next 6-digit `loyalty_display_id` for new `cafe_users` rows |
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

Implemented in Phase 1 with counters; Phase 7 adds **`loyalty_display_id`** and the loyalty ledger tables that stamp/reward flows write to. Phase 9 renames the per-cafe stamp counter to **`loyalty_card_progress`** to reflect that it tracks position on the *current* punch card, not lifetime stamps — those live in `loyalty_transactions`.

| Column                     | Type        | Notes |
| -------------------------- | ----------- | ----- |
| cafe_id                    | UUID        | FK → cafes, part of PK |
| user_id                    | UUID        | FK → users, part of PK |
| loyalty_card_progress      | INTEGER     | stamps earned toward the current reward (0..stampsPerReward-1); resets at rollover. Authoritative ledger is `loyalty_transactions` |
| total_orders               | INTEGER     | optional analytics |
| on_time_completed_orders   | INTEGER     | **increments only** for `source = app` when S4 on-time rule passes |
| review_prompt_state        | TEXT        | `not_shown` \| `shown_positive` \| `shown_negative` \| `dismissed` |
| first_visit                | TIMESTAMPTZ | |
| loyalty_display_id         | TEXT        | short till / QR code (**Phase 7**); legacy rows may be 8-char hex; **Phase 10** assigns 6-digit numeric IDs for new memberships via `cafes.loyalty_display_counter` |

**PK:** `(cafe_id, user_id)`  
**Indexes:** `(cafe_id, user_id)` already PK

---

## `menu_items`

Synced from POS adapter or edited via manual adapter / admin.

Implemented in Phase 1; **Phase 12** (`012_menu_modifier_library.sql`) adds `sizes`, `modifier_groups`, and `menu_item_modifier_groups`. Runtime uses the manual POS adapter with library merge. Admin dashboard provides full item + section CRUD — see `docs/menu-management.md`.

| Column           | Type        | Notes |
| ---------------- | ----------- | ----- |
| id               | UUID        | PK internal |
| cafe_id          | UUID        | FK NOT NULL |
| pos_item_id      | TEXT        | nullable for manual-only lines |
| name             | TEXT        | |
| description      | TEXT        | |
| price_minor      | INTEGER     | base / single-size anchor |
| currency         | TEXT        | default `GBP` |
| category         | TEXT        | hot_drinks, cold_drinks, food, extras |
| subcategory      | TEXT        | nullable (coffee, matcha, …) |
| image_url        | TEXT        | |
| emoji            | TEXT        | |
| is_available      | BOOLEAN     | |
| tags             | TEXT[]      | |
| sizes            | JSONB       | **Phase 12** — `NormalisedItemSize[]` absolute per-size prices |
| modifier_groups  | JSONB       | legacy embedded `NormalisedModifierGroup[]` (merged with library) |
| sort_order       | INTEGER     | |
| synced_at        | TIMESTAMPTZ | |
| created_at       | TIMESTAMPTZ | |

**Unique:** `(cafe_id, pos_item_id)` where `pos_item_id IS NOT NULL` (partial unique index)

---

## `modifier_groups` (Phase 12)

Café-scoped reusable modifier library (Milks, Syrups, Toppings).

| Column          | Type    | Notes |
| --------------- | ------- | ----- |
| id              | UUID    | PK |
| cafe_id         | UUID    | FK |
| name            | TEXT    | |
| selection_type  | TEXT    | `single` \| `multi` |
| required        | BOOLEAN | |
| max_select      | INTEGER | nullable cap for multi |
| options         | JSONB   | includes `colorHex`, `chipLabel` for KDS |
| sort_order      | INTEGER | |

---

## `menu_item_modifier_groups` (Phase 12)

Join table — which library sections attach to which items, ordered.

| Column            | Type | Notes |
| ----------------- | ---- | ----- |
| menu_item_id      | UUID | FK → menu_items |
| modifier_group_id | UUID | FK → modifier_groups |
| sort_order        | INT  | |

**PK:** `(menu_item_id, modifier_group_id)`

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

Implemented in Phase 2 (`002_orders_schema.sql`). Guest pay-in-store and Stripe Checkout creation are exposed as `POST /api/v1/orders` (see `docs/current/flows.md`). KDS list/complete and Socket.io fan-out run after KDS login; **customer tracking** uses namespace `/customer` with JWT validation (see `docs/architecture/realtime.md`). Stripe **`checkout.session.completed`** updates orders via **`POST /api/v1/webhooks/stripe`** using **`webhook_events.processing_status`** for safe retries.

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
| requested_pickup_not_before | TIMESTAMPTZ | optional customer delay floor (`pickupDelayMinutes`) |
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

## `webhook_events`

One row per **`(provider, event_id)`** so Stripe retries never double-apply business logic.

**Created** in Phase 5 (`005_payment_webhook_schema.sql`). **Phase 6** (`006_webhook_events_processing_status.sql`) adds **`processing_status`**, **`last_error`**, and **`updated_at`** so failed handlers remain retryable. Claim / complete / fail helpers: `apps/moonshot-api/src/lib/payments/repository.ts`.

| Column              | Type        | Notes |
| ------------------- | ----------- | ----- |
| id                  | UUID        | PK |
| provider            | TEXT        | e.g. `stripe` |
| event_id            | TEXT        | Stripe `evt_…` |
| cafe_id             | UUID        | nullable FK → cafes |
| processed_at        | TIMESTAMPTZ | updated when marked **`processed`** |
| processing_status   | TEXT        | **`pending`** \| **`processing`** \| **`processed`** \| **`failed`** (CHECK) |
| last_error          | TEXT        | set when **`failed`** |
| updated_at          | TIMESTAMPTZ | reclaim stuck **`processing`** after **15 minutes** → **`failed`** |

**Unique:** `(provider, event_id)` — duplicate successful deliveries no-op; **`failed`** rows can be claimed again on Stripe retry.

---

## `loyalty_transactions` (ledger)

Append-only stamps / rewards; **`cafe_users.loyalty_card_progress`** is updated in the same transaction as ledger writes for fast reads.

**Created** in Phase 7 (`007_loyalty_ledger.sql`). Partial unique index enforces idempotent **`stamp_earned`** per `(cafe_id, user_id, order_id)`.

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

Free-drink (or other) vouchers before redemption.

**Created** in Phase 7 (`007_loyalty_ledger.sql`).

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
