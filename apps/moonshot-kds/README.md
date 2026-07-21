# moonshot-kds

Kitchen display: **React + Vite + TypeScript** with **plain CSS** (no MUI).

## What ships today

- Café slug + device login (`POST /kds/auth/login`)
- Open orders list + **Done** (`GET /kds/orders`, `POST /kds/orders/:id/complete`)
- Socket.io namespace **`/kds`** for `kds:order:new` / `removed` / ETA updates
- Safety-net poll on reconnect / interval

Milk-colour chips, bean badges, and rich prep chrome are **not** built yet — `KdsConfig` may carry those keys for a future board pass. The board renders **`NormalisedOrder`** directly.

## Local env

- `VITE_API_URL` — API origin only (e.g. `http://localhost:3000`). Do **not** include `/api/v1`.

KDS users are created via **admin onboarding** (`POST /admin/onboarding/kds-users`) or the API bootstrap CLI (`pnpm bootstrap:kds-user` in `@moonshot/api`).
