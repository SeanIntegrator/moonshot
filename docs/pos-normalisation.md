# POS → normalised catalogue (manual-first)

Moonshot treats **`NormalisedMenu`** / **`NormalisedOrder`** as the internal contract. The **manual** adapter reads `menu_items` + `modifier_groups` JSON from Postgres today.

When adding Square, SumUp, Lightspeed, or Epos adapters:

1. **Keep secrets and HTTP in the adapter** — `PosAdapter.fetchMenu`, `verifyWebhookSignature`, `parseWebhook`.
2. **Map provider fields → `NormalisedMenuItem`** — internal UUIDs for rows you control; use `posItemId` / `posOptionId` when you need a stable external key for sync/dedupe.
3. **Persist ingress separately** — use a small service that turns `NormalisedWebhookEvent` / fetched orders into `orders` + `order_items` rows with `(cafe_id, pos_order_id)` dedupe; avoid embedding SQL in provider SDK wrappers.
4. **Modifiers** — map provider modifier sets into `NormalisedModifierGroup[]`; order lines still snapshot selections as `NormalisedOrderLineModifier[]` with `groupId` / `optionId` for KDS clarity.

Until a live provider is enabled, `pos_provider = manual` remains the supported production path.
