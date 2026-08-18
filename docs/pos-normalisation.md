# POS → normalised catalogue

Moonshot treats **`PosCatalog`** (and the derived **`NormalisedMenu`**) as the internal contract between POS adapters and Postgres. Customer-facing `GET /menu` always reads Postgres via `fetchMenuForCafe` — POS adapters are for **sync/ingress** only.

## POS-neutral contract (`PosCatalog`)

Any POS adapter (Square today, Lightspeed later) must normalise into:

```ts
PosCatalog {
  cafeId
  sections: PosCatalogSection[]   // key, label, parentKey, posCategoryId, kind, sortOrder
  items: NormalisedMenuItem[]     // category = leaf section key; modifierGroups[].id = POS group id
  groupsByPosId: Map<posGroupId, PosCatalogModifierGroup>  // + role hint
  deletedPosItemIds: string[]
  fetchedAt
}
```

The shared writer is [`menu-catalog-upsert.ts`](../apps/moonshot-api/src/lib/pos-catalog/menu-catalog-upsert.ts):

| Mode | Entry | Behaviour |
|------|-------|-----------|
| Onboarding | `persistNormalisedMenuCatalog` | Rejects non-empty menus; empty catalogues |
| Sync | `syncNormalisedMenuCatalog` | Upserts deltas; soft-deletes `deletedPosItemIds` |

A Lightspeed adapter produces the same `PosCatalog` and reuses the upsert — no Square types leak into the persist layer.

## Ownership matrix

| Source | What it owns |
|--------|----------------|
| POS catalogue | Items (name, price, sizes/variations, category tree, availability), modifier lists with POS names, images |
| Moonshot (opt-in) | Flow prep groups the POS cannot express: Shots, Beans, Milk Temperature, Milk Texture, Ice Level, Toppings — attached **only** when an admin assigns a drink archetype |

**On sync upsert:** POS wins for `name`, `description`, `price_minor`, `currency`, `category`, `sizes`, POS-linked modifier attachments, `is_available`, and `image_url` when the POS supplies a photo (`image_source = pos`). Soft-delete sets `is_available = false`.

**Default template photos:** when the POS has no photo, the item name exactly matches a Moonshot template drink (trim + case-insensitive), `use_default_image` is true (default), and menu image storage is configured, sync sets `image_url` to the shared `template/drinks/{key}.webp` URL and `image_source = template`. Legacy café uploads (`image_source = upload`) are never overwritten when the POS has no photo. Admins cannot replace POS item photos in Moonshot — change the image in Square, then sync (see [menu-images.md](./menu-images.md)).

**Moonshot prep preservation:** attachments with `pos_group_id IS NULL` survive a sync **only when `menu_items.archetype IS NOT NULL`** (admin deliberately opted in). Otherwise Square's list is the whole picture — no auto-inferred prep.

## Category hierarchy

Square `CatalogCategory` exposes `parentCategory`, `isTopLevel`, `pathToRoot`. The Square adapter mirrors this as a **two-level** tree:

- Top-level categories → `parentKey = null`
- Child categories → `parentKey` = top-level Moonshot key
- Deeper trees collapse so the leaf hangs under the top-most ancestor

Order-ahead **promotes non-empty leaves** to nav tabs / section headers (e.g. Sweet, Savory) and hides empty container parents (e.g. Food). Admin keeps the full parent → child tree.

Keys are generated from labels (`slugifyMenuSectionKey`) but **matched on `pos_category_id`**, so a rename in Square updates the label and leaves the Moonshot key (and historical `order_items.category`) stable.

**Incremental sync:** item deltas often omit CATEGORY objects. Placement merges existing `pos_category_id → key` from Postgres, and the sync path BatchRetrieves any referenced category ids (plus parents) missing from the snapshot so new leaves are not forced to `uncategorised`.

`menu_sections.kind` (`drink` | `food`) drives KDS food/drink split and loyalty pastry matching via `cafes.kds_config.foodSectionKeys` — not the literal string `"food"`.

## Modifiers

- Item modifier lists honour Square `modifierListInfo.ordinal` (sort order), `enabled`, per-item min/max, and `modifierOverrides`.
- List names are **not renamed**. Import appends them into `kds_config.modifierClassification`.
- Signup may seed Milks/Syrups for template cafés. On POS import, a Square list named `Milks` **claims** the seeded row. Unclaimed seeded Milks/Syrups with no attachments are deleted when Square supplied an equivalent role.

## Realtime menu invalidation

After a successful catalog sync (webhook / manual / cron), the API emits:

- `admin:menu:synced` on `/admin` room `admin:cafe:{cafeId}`
- `customerMenuUpdated` on `/customer` room `customer:cafe:{cafeId}`

Admin and order-ahead clients soft-reload; the old 10s Admin poll is gone (60s reconcile remains as a safety net).

See [architecture/realtime.md](./architecture/realtime.md) and [square-oauth.md](./square-oauth.md).

Starter Square fixture: [`apps/moonshot-api/fixtures/pos/square/`](../apps/moonshot-api/fixtures/pos/square/).
