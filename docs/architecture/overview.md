# Architecture overview

Stable rules that should survive refactors.

## Components

Monorepo layout:

- **`@moonshot/api`** — Express 5 HTTP API + Postgres + Socket.io on the **same HTTP server**
- **`@moonshot/order-ahead`** — Customer PWA (Vite/React)
- **`@moonshot/kds`** — Kitchen display login + live board
- **`@moonshot/admin`** — Placeholder shell; menu mutation lives in API only today
- **`@moonshot/types`** — Shared DTO envelopes, JWT contract shapes, socket payload types (`API_VERSION_PREFIX`, etc.)

Postgres remains the **source of truth** for cafes, menus, users, memberships, orders, and KDS device accounts.

## HTTP versioning

Versioned REST lives under **`/api/v1`**, exposed as [`API_VERSION_PREFIX`](../../packages/types/src/api.ts) in `@moonshot/types`. Apps must prepend it to logical paths (`/orders`, `/menu`, …).

## Café context

Scoped routes resolve the café via:

1. **`X-Cafe-Slug`** header, or  
2. **`:slug`** in paths such as **`GET /api/v1/cafe/:slug`**

Subdomain/`Host`/header-based tenancy is **not** implemented yet.

See [HTTP surface](../current/http-surface.md) for endpoints and headers.
