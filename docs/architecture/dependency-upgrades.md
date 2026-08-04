# Dependency upgrade policies

Stable rules for keeping package versions, pins, and install policy aligned. Written after the Aug 2026 Dependency Upgrade Programme.

## Stripe API version pin

The Node SDK is two things bolted together: an HTTP client that sends a `Stripe-Version` header, and TypeScript types generated from the OpenAPI spec at the SDK cut.

**Rule:** `STRIPE_API_VERSION` in [`stripe-client.ts`](../../apps/moonshot-api/src/lib/payments/stripe-client.ts) must be typed as `Stripe.LatestApiVersion` **without** an `as` cast:

```ts
const STRIPE_API_VERSION: Stripe.LatestApiVersion = '2026-07-29.dahlia';
```

That way the compiler enforces that the pin matches the installed `stripe` package. Never assert a newer date than the SDK ships.

**Webhook half:** payload shape follows the API version configured on each webhook **endpoint in the Stripe Dashboard**, not the client pin. When bumping the SDK / pin, update the Dashboard endpoint version to the same date (or intentionally stage them).

**Upgrade path:** bump `stripe` major-by-major (or in one deliberate hop), read each major's changelog against our surface (`checkout.sessions`, `coupons`, Express `accounts` / `accountLinks`, `webhooks.constructEvent`). Stripe Node v22+ requires `RequestOptions` as the last arg — e.g. `sessions.retrieve(id, undefined, { stripeAccount })`.

Live Stripe test-mode checkout + Connect onboarding is required after a major bump; unit tests mock `getStripeOrNull` and do not prove API drift.

## Vite / plugin-react / Vitest coupling

These three move together on frontend apps:

| Package | Peer constraint |
|---------|-----------------|
| `vite` ^8 | — |
| `@vitejs/plugin-react` ^6 | requires `vite: ^8` |
| `vitest` ^4 | requires `vite: ^6 \|\| ^7 \|\| ^8` |

`@tailwindcss/vite` already supports Vite 8. Prefer `import.meta.dirname` over `__dirname` in Vite configs (native config loader warning).

The API has no Vite app dependency but Vitest 4 needs Vite as a peer — keep `vite` as a **devDependency** of `@moonshot/api`.

**Vitest 4 mock note:** `vi.fn(() => …)` arrow implementations are not constructable. Prefer `vi.fn(function MockX() { … })` when the production code uses `new`.

Frontend `start` scripts serve production via `vite preview`, so Vite is a runtime web server — keep it current for security backports.

## pnpm 11 settings

`packageManager` in the root [`package.json`](../../package.json) and `version:` in [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) must stay in sync (`pnpm/action-setup` rejects conflicts).

pnpm 11 ignores the `pnpm` field in `package.json`. Settings live in [`pnpm-workspace.yaml`](../../pnpm-workspace.yaml):

- **`onlyBuiltDependencies` / `allowBuilds`** — allow lifecycle scripts only for native packages (`esbuild`, `sharp`). Without this, installs fail with `ERR_PNPM_IGNORED_BUILDS`.
- **`minimumReleaseAge: 0`** — default is ~24h and blocks same-day caret bumps. Raise toward `1440` once the lockfile is stable and CI is not fighting fresh publishes.

## shadcn (KDS)

`shadcn` ships `shadcn/tailwind.css`, imported by KDS. Keep it in **devDependencies** (needed at build time; CSS is inlined into the bundle). Do not put it in `dependencies` — that pulls Babel / MCP / a second Zod into production installs. CLI usage: `pnpm dlx shadcn@latest add …`.

## MUI (admin + order-ahead)

There is **no MUI 8** on npm — majors jumped 7 → 9. Prefer official codemods (`npx @mui/codemod@latest`):

1. `v7.0.0/all` + `v7.0.0/theme-color-functions` (`alpha(...)` → `theme.alpha(...)`; fix callback params named `t` by hand)
2. Jump to 9 with `v9.0.0/system-props` + `deprecations/all`
3. Manual: icon renames (`*Outline` → `*Outlined`), Button `containedPrimary` styleOverrides → `variants` under `root`

## Standard gate

After any dependency phase:

```bash
pnpm install && pnpm build && pnpm typecheck && pnpm test && pnpm lint
```
