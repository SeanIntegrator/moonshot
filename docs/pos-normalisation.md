# POS → normalised catalogue (manual-first)

Moonshot treats **`NormalisedMenu`** / **`NormalisedOrder`** as the internal contract. The **manual** adapter reads `menu_items` + `modifier_groups` JSON from Postgres today. Customer-facing `GET /menu` always reads Postgres via `fetchMenuForCafe` — POS adapters are for **sync/ingress** only.

When adding Square, SumUp, Lightspeed, or Epos adapters:

1. **Keep secrets and HTTP in the adapter** — `PosAdapter.fetchMenu`, `verifyWebhookSignature`, `parseWebhook`.
2. **Map provider fields → `NormalisedMenuItem`** — internal UUIDs for rows you control; use `posItemId` / `posOptionId` / `pos_group_id` when you need a stable external key for sync/dedupe.
3. **Persist ingress separately** — use `persistNormalisedMenuCatalog` (onboarding) or a small order-ingress service; avoid embedding SQL in provider SDK wrappers.
4. **Modifiers** — map provider modifier sets into `NormalisedModifierGroup[]`; order lines still snapshot selections as `NormalisedOrderLineModifier[]` with `groupId` / `optionId` for KDS clarity.
5. **Onboarding import** — POS catalogue ingress uses `getMenuProvisioner('pos')` → `PosAdapter.fetchMenu` → `persistNormalisedMenuCatalog`. Template onboarding uses `getMenuProvisioner('template')`.

## Square adapter (live for onboarding import)

See [square-oauth.md](./square-oauth.md) for OAuth, token storage, and Admin UX.

### Decision: Square owns items + modifiers; Moonshot layers prep

| Source | What it owns |
|--------|----------------|
| Square Catalog | Items (name, price, sizes/variations, category), modifier lists (milks, syrups, etc.) with Square's names |
| Moonshot | Flow prep groups Square cannot express: Shots, Beans, Milk Temperature, Milk Texture, Ice Level, Toppings — attached via `inferDrinkArchetypeFromName` + `slotFilter` (never milk/syrup slots) |

Square list names are **not renamed**. Import appends them into `cafes.kds_config.modifierClassification` so KDS chip matching still works.

### Mapping table

```
CatalogCategory
  → menu_sections (hot_drinks / cold_drinks / food by name, else custom key)

CatalogItem (+ ItemVariation)
  → NormalisedMenuItem
      posItemId     = CatalogItem.id
      priceMinor    = variation price (minor units)
      sizes         = multi-variation → NormalisedItemSize[]; single → []
      category      = mapped section key

CatalogModifierList + CatalogModifier
  → NormalisedModifierGroup + NormalisedModifierOption
      pos_group_id  = modifier list id (DB column)
      posOptionId   = modifier id
      name          = Square's list / option name (kept)
```

Signup still seeds Milks/Syrups. On import, a Square list named `Milks` **claims** the seeded row (`pos_group_id` + replace options). Unclaimed seeded Milks/Syrups with no item attachments are deleted when Square supplied an equivalent role.

Starter Square Item Library CSV (template defaults + food) for Dashboard seeding and adapter tests: [`apps/moonshot-api/fixtures/pos/square/`](../apps/moonshot-api/fixtures/pos/square/).
