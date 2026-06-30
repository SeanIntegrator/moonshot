# Current implemented flows (summary)

Thin path in production today:

1. **Order-ahead** loads café + menu (`GET /cafe/:slug`, `GET /menu`). Optional Google sign-in (`POST /auth/google`, `GET /auth/me`).
2. **Place order:** `POST /orders` with basket. **Guest** responses include **`trackingToken`** when `JWT_SECRET` is set and the row stays guest (`user_id` null). **Signed-in** calls may send **`Authorization`** to attach **`orders.user_id`** (then no `trackingToken`).
3. **KDS:** device login → `GET /kds/orders` + Socket namespace **`/kds`** (`kds:order:new` / `kds:order:removed`).
4. **Customer tracking:** order-ahead opens **`/customer`**, emits `customer:subscribe` with `orderId` + `authToken` (tracking JWT or session JWT); KDS completion emits **`customerOrderCompleted`** to that room. **Loyalty + ETA recompute** run after the order row is `completed`; failures there are logged and **do not** fail the KDS **Done** HTTP response.
5. **Admin:** pre-seeded admin login → dashboard updates order-ahead feature settings, KDS config, and existing menu item price/availability/modifier option prices.
6. **Track order:** order-ahead **`/orders/:id`** polls while the order is open and opens **`/customer`** socket tracking where possible (`useOrderTracking`). Stripe success URLs land on **`/:cafeSlug/checkout/restore?checkout_session_id=…`** (or Home forwards there). Recovery calls **`GET /orders/checkout-session/:sessionId`** with the route slug as **`X-Cafe-Slug`** — see [stripe-checkout-return.md](../stripe-checkout-return.md).

### Stripe vs pay-in-store (customer-visible)

| Mode | Initial DB status | KDS sees order when |
|------|-------------------|---------------------|
| `pay_in_store` | `confirmed` / `unpaid` | Immediately on `POST /orders` |
| `stripe` | `pending` / `unpaid` | After webhook **or** checkout return recovery confirms `paid` / `confirmed` |

Home **`GET /orders/me`** includes **`pending`** in active orders; KDS open queue does **not** — a paid Stripe order stuck as `pending` looks like "order on Home, nothing on KDS".

### Order status stepper (v1)

Kitchen statuses **`preparing` / `ready`** are not yet pushed on every flow; the UI uses a **four-chip** stepper driven by **`OrderStatus`** when present and **`customerOrderCompleted`** for the final step. **Practical v1:** treat non-terminal orders as **queue-bound** — poll **`GET /orders/:id`** every ~15s (and rely on socket ETA events when connected). When most tickets stay in **`confirmed`** until completion, the customer sees a **two-phase mental model**: *Queued* (chips 0–2 collapsed visually or idle) → *Done*. A fast-follow can wire explicit **`preparing` / `ready`** transitions from KDS for richer steps.

Auth details — [architecture/realtime.md](../architecture/realtime.md).

Sequences with Mermaid — [dataflow-sequences.md](../dataflow-sequences.md) (implemented S0–S3 + KDS/customer/admin paths).
