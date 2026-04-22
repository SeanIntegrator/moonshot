# Moonshot (Zappuccino v2)

Ground-up rebuild monorepo: API, KDS, order-ahead PWA, and admin.

## Layout

| Path | Package | Stack |
|------|---------|--------|
| [apps/moonshot-api](apps/moonshot-api) | `@moonshot/api` | Node, Express, TypeScript, `tsx` |
| [apps/moonshot-order-ahead](apps/moonshot-order-ahead) | `@moonshot/order-ahead` | Vite, React 19, TypeScript, **MUI** |
| [apps/moonshot-kds](apps/moonshot-kds) | `@moonshot/kds` | Vite, React 19, TypeScript, plain CSS (no MUI) |
| [apps/moonshot-admin](apps/moonshot-admin) | `@moonshot/admin` | Vite, React 19, TypeScript, **MUI** |
| [packages/types](packages/types) | `@moonshot/types` | Shared contracts |

- [docs/](docs/) — architecture and dataflow (start with `dataflow-high-level.md`)

All apps depend on `@moonshot/types` via `workspace:*`.

**React 19** is used across Vite apps so `@types/react` stays deduped in the workspace.

## Commands

```bash
pnpm install
pnpm build
pnpm typecheck
pnpm dev
```

### Run one app

```bash
pnpm --filter @moonshot/api dev
pnpm --filter @moonshot/order-ahead dev
pnpm --filter @moonshot/kds dev
pnpm --filter @moonshot/admin dev
```

## Railway

Create one service per app; set **Root directory** to the app folder (e.g. `moonshot/apps/moonshot-api`). Use the same monorepo repo for each service.

Legacy prototypes (`cafe-orders`, `customer-app`) are **not** part of this workspace.
