# Architecture overview

Stable rules that should survive refactors.

## Components

Monorepo layout:

- **`@moonshot/api`** — Express 5 HTTP API + Postgres + Socket.io on the **same HTTP server** (namespaces `/kds`, `/customer`, `/admin`)
- **`@moonshot/order-ahead`** — Customer order-ahead web app (Vite/React/MUI); café-themed, multi-tenant via `/:cafeSlug/*` (not an installable PWA today)
- **`@moonshot/kds`** — Kitchen display: Flow board UI (Vite/React, **Tailwind v4 + shadcn**), login, open/recent orders, status/ETA/complete/recall
- **`@moonshot/admin`** — Self-service café-owner console (signup/onboarding, settings, menu, Stripe Connect, Square OAuth)
- **`@moonshot/marketing`** — Public marketing site and signup entry (separate app; not on the order/KDS path)
- **`@moonshot/types`** — Shared DTO envelopes, JWT contract shapes, socket payload types
- **`@moonshot/domain`** — Shared domain helpers (API version prefix, hours defaults, POS webhook shapes, drink-archetype platform config, …)
- **`@moonshot/web-runtime`** — Shared Vite frontend runtime helpers (e.g. runtime-config writer consumed by admin/KDS/order-ahead)

Postgres remains the **source of truth** for cafes, menus, users, memberships, orders, KDS device accounts, admin accounts, and POS connections.

For where repositories and services live in the API codebase, see [api-modules.md](api-modules.md).

## HTTP versioning

Versioned REST lives under **`/api/v1`**, exposed as [`API_VERSION_PREFIX`](../../packages/domain/src/dataflow.ts) in `@moonshot/domain`. Apps must prepend it to logical paths (`/orders`, `/menu`, …).

## Café context

Scoped routes resolve the café via:

1. **`X-Cafe-Slug`** header, or
2. **`:slug`** in paths such as **`GET /api/v1/cafe/:slug`**

Subdomain/`Host`-based tenancy is **not** implemented yet.

See [HTTP surface](../current/http-surface.md) for endpoints and headers.
