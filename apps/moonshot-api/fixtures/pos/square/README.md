# Square POS catalog fixtures

Starter Item Library for seeding a Square Dashboard location and for Catalog API → `NormalisedMenu` work (onboarding “Import from POS”, roadmap M3). See also `sandbox-catalog-snapshot.json` used by unit tests.

## `cafe-starter-catalog.csv`

Mirrors Moonshot’s default onboarding template drinks plus Clay & Bean seed food:

| Section | Items |
|---------|--------|
| Hot drinks (£3.50) | Espresso, Americano, Macchiato, Cortado, Flat white, Latte, Cappuccino, Mocha, Hot chocolate, Breakfast tea |
| Cold drinks (£3.50) | Iced latte, Iced americano |
| Food | Almond croissant (£2.80), Pain au chocolat (£2.50), Oat cookie (£2.20) |

Column layout matches a blank Square Item Library export (including location headers for **ClayTest**). Leave **Token** blank for new items; do not reorder or delete columns.

Stable **SKU** values (`MS-HOT-…`, `MS-COLD-…`, `MS-FOOD-…`) are intentional anchors for later `posItemId` mapping tests.

Milks / syrups are **not** rows here — they belong in Square as `CatalogModifierList`s, matching Moonshot’s modifier library (not item options / SKU explosions).

## Import into Square Dashboard

1. Square Dashboard → **Items** → **Actions** → **Import library**.
2. Upload `cafe-starter-catalog.csv` (or convert to `.xlsx` if preferred).
3. Confirm column matching; keep ClayTest location headers if that is your location name. If the location was renamed, rename the `* ClayTest` headers to match before import.
4. After items land, create **Milks** and **Syrups** modifier sets in the Dashboard (or via Catalog API). Re-exporting the library afterwards adds modifier-set Y/N columns you can tick per drink.

See [Square bulk import help](https://squareup.com/help/us/en/article/5153-import-items-online).

## Mapping target (Square adapter)

Production import uses **OAuth + Catalog API**, not parsing this CSV in the app. Expected normalisation:

```
CatalogItem (+ ItemVariation)
  → NormalisedMenuItem
      posItemId     = CatalogItem / variation id (or stable SKU during tests)
      priceMinor    = price × 100 (GBP)
      category      = "Hot drinks"|"Cold drinks"|"Food" → hot_drinks|cold_drinks|food

CatalogModifierList + CatalogModifier
  → NormalisedModifierGroup + NormalisedModifierOption
      posOptionId   = modifier id
```

See [`docs/pos-normalisation.md`](../../../../docs/pos-normalisation.md) and [`docs/onboarding.md`](../../../../docs/onboarding.md).
