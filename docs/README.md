# Moonshot documentation

Start here when onboarding or verifying behaviour against production.

## How this folder is organised

| Area | Purpose |
|------|---------|
| [architecture/](architecture/overview.md) | **Stable**: invariants that should stay true as the codebase grows |
| [current/](current/http-surface.md) | **What runs today**: HTTP routes, env vars, deployed flows |
| [progress.md](progress.md) | **Changelog + still planned**: shipped features, snags, next steps |

## Quick links

- [Launch roadmap](architecture/roadmap.md) — Clay & Bean workstreams (loyalty hot-update, review nudge, admin redesign, branding, installability, KDS notes, cutover)
- [Realtime / Socket auth](architecture/realtime.md) — `/kds`, `/customer`, `/admin`, JWT rules
- [KDS board contracts](architecture/kds-board.md) — chips, status machine, ETA stretch, Flow board
- [KDS UI (shadcn)](kds-ui.md) — Base UI + `base-nova`, dark theme, app-local components
- [Current flows](current/flows.md) — shipped vs planned sequences
- [Stripe checkout return](stripe-checkout-return.md) — `ORDER_AHEAD_BASE_URL`, recovery endpoint
- [Square OAuth](square-oauth.md) — Connect, catalog sync, webhooks
- [Review nudge](feedback-prompt-flow.md) — single-CTA launch design
- [M1 bug triage](bugs/m1-triage.md) — discrete cards for remaining UI glitches
- [API module layout](architecture/api-modules.md) — where order/loyalty/admin/menu logic lives
- [HTTP routes & CORS](current/http-surface.md)
- [Self-service onboarding](onboarding.md)
- [Order-ahead styling](order-ahead-styling.md) — theme packs, radii, webfonts
- [POS → normalised menu/order mapping](pos-normalisation.md)
- Shared packages: [`@moonshot/types`](../packages/types), [`@moonshot/domain`](../packages/domain), [`@moonshot/web-runtime`](../packages/web-runtime)
