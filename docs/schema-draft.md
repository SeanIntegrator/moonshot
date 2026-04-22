# Postgres schema draft (v2)

Markdown-only draft for review **before** SQL migrations. Multi-tenant: **`cafe_id` on all tenant-scoped tables**. Clay & Bean is the only live café at launch; schema still uses UUIDs everywhere.

## Conventions

- Primary keys: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- Timestamps: `created_at`, `updated_at` `TIMESTAMPTZ` where mutable
- Money: integer **minor units** (`*_minor`) + `currency TEXT` ISO 4217
- Soft config: `JSONB` on `cafes` for POS credentials, payment config, `features`, `kds_config`, theme overrides

---

## `cafes`

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

## `orders`

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

- `(cafe_id, status, created_at DESC)` for KDS open queue
- `UNIQUE (cafe_id, pos_order_id)` where `pos_order_id IS NOT NULL`

---

## `order_items`

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

---

## `payment_sessions`

Normalises what v0.1 stored as JSONB on `orders`.

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

---

## `feedback_responses`

Stores thumbs + optional owner email + Google follow-through.

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

---

## Webhook idempotency (recommended)

| Table | Purpose |
| ----- | ------- |
| `webhook_events` | `(cafe_id, provider, event_id)` UNIQUE processed log |

Prevents double-processing `payment.created` bursts.
