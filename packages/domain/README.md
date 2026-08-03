# @moonshot/domain

Runtime domain logic shared across API, admin, KDS, and order-ahead.

Depends on `@moonshot/types` (pure contracts). Types never imports domain — no cycles.

Import runtime helpers and domain constants from here (e.g. `cafeOpenStatus`, `deriveFlowLine`, `API_VERSION_PREFIX`, menu template / loyalty / POS adapter helpers). Keep wire shapes and API DTOs in `@moonshot/types`.
