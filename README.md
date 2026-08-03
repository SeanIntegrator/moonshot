# Moonshot

Ground-up rebuild monorepo: API, KDS, order-ahead, admin, and marketing.

## Layout

| Path | Package | Stack |
|------|---------|--------|
| [apps/moonshot-api](apps/moonshot-api) | `@moonshot/api` | Node, Express, TypeScript, `tsx` |
| [apps/moonshot-order-ahead](apps/moonshot-order-ahead) | `@moonshot/order-ahead` | Vite, React 19, TypeScript, **MUI** |
| [apps/moonshot-kds](apps/moonshot-kds) | `@moonshot/kds` | Vite, React 19, TypeScript, **Tailwind v4 + shadcn** |
| [apps/moonshot-admin](apps/moonshot-admin) | `@moonshot/admin` | Vite, React 19, TypeScript, **MUI** |
| [apps/moonshot-marketing](apps/moonshot-marketing) | `@moonshot/marketing` | Vite, React 19, TypeScript |
| [packages/types](packages/types) | `@moonshot/types` | Shared contracts |
| [packages/domain](packages/domain) | `@moonshot/domain` | Shared domain helpers |
| [packages/web-runtime](packages/web-runtime) | `@moonshot/web-runtime` | Shared Vite runtime helpers |

- [docs/](docs/) — architecture and current flows (start with `docs/README.md`)

Apps depend on workspace packages via `workspace:*` (`@moonshot/types`, and where needed `@moonshot/domain` / `@moonshot/web-runtime`).

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
pnpm --filter @moonshot/marketing dev
```
