# Mid-level sequence diagrams

Concrete HTTP routes and Socket.io event names for implementation and for `@moonshot/types` contracts. Paths use the `/api/v1` prefix assumed in the master architecture doc.

---

## S1 — POS walk-in order (Square)

Square does not reliably emit `order.created` for register-originated orders; the resilient pattern is **`payment.created` / `payment.updated`** → fetch order by id → normalise → upsert Postgres → emit to KDS room.

```mermaid
sequenceDiagram
  participant POS as Square_POS
  participant SqAPI as Square_API
  participant WH as moonshotApi_webhook
  participant Ad as square_adapter
  participant DB as Postgres
  participant IO as Socket_io
  participant KDS as moonshotKDS

  POS->>SqAPI: Payment_recorded
  SqAPI->>WH: POST_api_v1_webhooks_cafe_provider
  WH->>Ad: verifyWebhookSignature
  WH->>Ad: parseWebhook
  Ad->>SqAPI: fetchOrder_payment_order_id
  SqAPI-->>Ad: Square_order_JSON
  Ad-->>WH: NormalisedWebhookEvent
  WH->>DB: UPSERT_orders_pos_order_id_dedup
  WH->>IO: emit_kds_order_new_room
  IO->>KDS: kds_order_new
```

**Polling fallback (optional):** a scheduled `SearchOrders` (or provider equivalent) runs as a safety net; only orders **not already visible** in the last poll window emit `kds:order:new`. Dedupe is **DB-level** on `(cafe_id, pos_order_id)`, not in-memory.

---

## S2 — Order-ahead: new order + checkout

```mermaid
sequenceDiagram
  participant PWA as moonshotOrderAhead
  participant API as moonshotApi
  participant DB as Postgres
  participant St as Stripe
  participant WH as Stripe_webhook
  participant IO as Socket_io
  participant KDS as moonshotKDS

  PWA->>API: POST_api_v1_orders_JWT
  API->>DB: INSERT_orders_pending_line_items
  API->>St: createCheckoutSession
  St-->>PWA: redirect_url
  PWA->>St: customer_pays
  St->>WH: checkout_session_completed
  WH->>DB: UPDATE_orders_confirmed_payment
  WH->>API: recomputePickupEtas_cafe
  WH->>IO: emit_kds_order_new
  IO->>KDS: kds_order_new
  WH->>IO: emit_customer_eta_updated
  IO->>PWA: customerEtaUpdated
```

After payment confirmation, **pickup ETA** is computed (S5) so `quoted_pickup_time` and live `pickup_time` are populated before the KDS sees the card.

---

## S3 — Order-ahead: merge / add items to existing order

Customer edits an already-placed order; server issues a **delta** Stripe Checkout for the price difference, then merges line items when paid.

```mermaid
sequenceDiagram
  participant PWA as moonshotOrderAhead
  participant API as moonshotApi
  participant DB as Postgres
  participant St as Stripe
  participant WH as Stripe_webhook
  participant IO as Socket_io
  participant KDS as moonshotKDS

  PWA->>API: PATCH_api_v1_orders_id_editToken
  API->>DB: validate_status_and_edit_token
  API->>St: createIncrementalCheckoutSession
  St-->>PWA: redirect_url
  PWA->>St: customer_pays_delta
  St->>WH: checkout_session_completed
  WH->>DB: INSERT_new_order_items_MERGE
  WH->>DB: INSERT_payment_sessions_row
  WH->>API: recomputePickupEtas_cafe
  WH->>IO: emit_kds_order_updated
  IO->>KDS: kds_order_updated_mergeFlag
  WH->>IO: emit_customer_eta_updated
  IO->>PWA: customerEtaUpdated
```

**KDS contract:** `kds:order:updated` carries `mergeFlag: true` and `newItemIds: string[]` so the UI can pulse the card and mark new lines (see `@moonshot/types`).

---

## S4 — KDS marks done → loyalty → customer completion → review prompt gate

```mermaid
sequenceDiagram
  participant KDS as moonshotKDS
  participant API as moonshotApi
  participant DB as Postgres
  participant IO as Socket_io
  participant PWA as moonshotOrderAhead

  KDS->>API: POST_api_v1_kds_orders_id_complete
  API->>DB: UPDATE_orders_completed_at
  API->>DB: INSERT_loyalty_transactions_if_app
  API->>IO: emit_customer_order_completed
  IO->>PWA: customerOrderCompleted
  PWA->>PWA: if_app_order_and_on_time_plus_2m
  PWA->>API: PATCH_api_v1_cafe_users_me_review_counter_optional
  Note over PWA,API: Server_authoritative_increment_preferred
  API->>DB: UPDATE_cafe_users_on_time_completed_orders
  API-->>PWA: cafe_user_row
  PWA->>PWA: if_counter_eq_3_and_not_shown_show_drawer
```

**On-time rule:** `completed_at <= pickup_time + 2 minutes` (product decision; encoded in types/docs).

**Review prompt:** see [feedback-prompt-flow.md](feedback-prompt-flow.md). Both thumbs-up and thumbs-down paths surface a **Google review CTA** (compliance).

---

## S5 — Pickup ETA recalculation (automatic v1)

Triggered whenever queue-affecting state changes: new confirmed order, merge paid, order completed/cancelled, or line items change prep weight.

```mermaid
sequenceDiagram
  participant Svc as order_service_or_webhook
  participant ETA as pickup_eta_calculator
  participant DB as Postgres
  participant IO as Socket_io
  participant KDS as moonshotKDS
  participant PWA as moonshotOrderAhead

  Svc->>ETA: recompute_cafe_queue_cafeId
  ETA->>DB: SELECT_open_orders_ordered_by_queue
  ETA->>ETA: for_each_order_items_ahead_formula
  ETA->>DB: UPDATE_orders_pickup_time_batch
  ETA->>IO: emit_kds_eta_updated
  IO->>KDS: kds_eta_updated
  ETA->>IO: emit_customer_eta_updated
  IO->>PWA: customerEtaUpdated
```

**v1 formula (rudimentary):** for each open order in FIFO queue order:

`pickup_time = now + base_prep_minutes + (sum_quantity_of_items_ahead * per_item_minutes)`

Constants `base_prep_minutes` and `per_item_minutes` live in `cafes.kds_config` JSON (see [schema-draft.md](schema-draft.md)).

---

## Socket event summary

| Event                     | Room / audience | Payload idea                                      |
| ------------------------- | --------------- | ------------------------------------------------- |
| `kds:order:new`           | KDS             | `{ order: NormalisedOrder }`                    |
| `kds:order:updated`       | KDS             | `{ order, mergeFlag?, newItemIds? }`            |
| `kds:order:removed`       | KDS             | `{ orderId }`                                     |
| `kds:eta:updated`         | KDS             | `{ updates: { orderId, pickupTime }[] }`          |
| `customerOrderCompleted`  | customer        | `{ orderId, cafeId, completedAt }`                |
| `customerEtaUpdated`      | customer        | `{ updates: { orderId, pickupTime }[] }`          |

Exact shapes are defined in `@moonshot/types` (`KdsSocketEvent`, `CustomerSocketEvent`).
