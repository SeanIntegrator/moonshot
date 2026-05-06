# Moonshot documentation

Start here when onboarding or verifying behaviour against production.

## How this folder is organised

| Area | Purpose |
|------|---------|
| [architecture/](architecture/overview.md) | **Stable**: invariants that should stay true as the codebase grows |
| [current/](current/http-surface.md) | **What runs today**: HTTP routes, env vars, deployment notes |
| [roadmap.md](roadmap.md) | **Target state**: Stripe, ETA, modifiers, POS, etc., with planned vs done |
| [progress.md](progress.md) | **Changelog-style log**: shipped features, operational snags, recent decisions |

Historical narrative files ([dataflow-high-level.md](dataflow-high-level.md), [dataflow-sequences.md](dataflow-sequences.md)) are kept as deep references; diagrams there should align with **current/** and **architecture/**.

## Quick links

- [Realtime / Socket auth](architecture/realtime.md) — `/kds` vs `/customer`, JWT rules
- [HTTP routes & CORS](current/http-surface.md)
- [Postgres phases](schema-draft.md)
