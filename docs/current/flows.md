# Current implemented flows (summary)

Thin path in production today:

1. **Order-ahead** loads café + menu (`GET /cafe/:slug`, `GET /menu`). Optional Google sign-in (`POST /auth/google`, `GET /auth/me`).
2. **Place order:** `POST /orders` with basket. **Guest** responses include **`trackingToken`** when `JWT_SECRET` is set and the row stays guest (`user_id` null). **Signed-in** calls may send **`Authorization`** to attach **`orders.user_id`** (then no `trackingToken`).
3. **KDS:** device login → `GET /kds/orders` + Socket namespace **`/kds`** (`kds:order:new` / `kds:order:removed`).
4. **Customer tracking:** order-ahead opens **`/customer`**, emits `customer:subscribe` with `orderId` + `authToken` (tracking JWT or session JWT); KDS completion emits **`customerOrderCompleted`** to that room.

Auth details — [architecture/realtime.md](../architecture/realtime.md).

Sequences with Mermaid — [dataflow-sequences.md](../dataflow-sequences.md) (implemented S0–S3 + KDS).
