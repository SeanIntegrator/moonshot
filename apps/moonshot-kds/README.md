# moonshot-kds

Kitchen display: **React + Vite + TypeScript** with **plain CSS** (no MUI).

## What ships today

- Café slug + device login (`POST /kds/auth/login`)
- **Flow board**: row-based tickets with shot / milk / notes columns
- Loads `GET /kds/config` after login for milk colours, bean accents, timers
- Open orders via `GET /kds/orders` + Socket.io `/kds` (`kds:order:new` / `updated` / `removed` / ETA)
- Tap a **line** → local strikethrough; tap the **header** → `POST /kds/orders/:id/complete`
- Safety-net poll on reconnect / interval

See `docs/architecture/kds-board.md` for the Flow row model, ticket kinds, and hybrid timer rules.

## Local env

- `VITE_API_URL` — API origin only (e.g. `http://localhost:3000`). Do **not** include `/api/v1`.

KDS users are created via **admin onboarding** (`POST /admin/onboarding/kds-users`) or the API bootstrap CLI (`pnpm bootstrap:kds-user` in `@moonshot/api`).
