# moonshot-kds

Kitchen display: **React + Vite + TypeScript** with **plain CSS** (no MUI). Barista visuals (milk colours, chips, timers) use custom CSS and `KdsConfig` from the API.

## Local env

- `VITE_API_URL` — API origin only (e.g. `http://localhost:3000`). Do **not** include `/api/v1`.

Sign in with a café slug and credentials created via the API bootstrap script (see `apps/moonshot-api` README / `pnpm bootstrap:kds-user`).

Live updates use **Socket.io** (`kds:event` payloads match `KdsServerToClientEvent` in `@moonshot/types`). The board also refreshes open orders on reconnect and on a low-frequency interval as a safety net.

