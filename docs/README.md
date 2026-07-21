# Moonshot documentation

Start here when onboarding or verifying behaviour against production.

## How this folder is organised

| Area | Purpose |
|------|---------|
| [architecture/](architecture/overview.md) | **Stable**: invariants that should stay true as the codebase grows |
| [current/](current/http-surface.md) | **What runs today**: HTTP routes, env vars, deployed flows |
| [progress.md](progress.md) | **Changelog + still planned**: shipped features, snags, next steps |

## Quick links

- [Realtime / Socket auth](architecture/realtime.md) — `/kds` vs `/customer`, JWT rules
- [Current flows](current/flows.md) — shipped vs planned sequences
- [Stripe checkout return](stripe-checkout-return.md) — `ORDER_AHEAD_BASE_URL`, recovery endpoint
- [API module layout](architecture/api-modules.md) — where order/loyalty/admin logic lives
- [HTTP routes & CORS](current/http-surface.md)
- [Self-service onboarding](onboarding.md)
- [POS → normalised menu/order mapping](pos-normalisation.md)
