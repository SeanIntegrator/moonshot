# KDS UI (shadcn)

Kitchen Display System styling lives in `apps/moonshot-kds` only — not a shared monorepo UI package.

## Stack

- **shadcn/ui** with **Base UI** primitives (`components.json` style: `base-nova`)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **Dark** theme by default (`class="dark"` on `<html>`)
- Cool grey board (`--background`) with a slightly lighter ticket surface (`--card`) + Geist Variable

Prebuilt components under `src/components/ui/` (Button, Input, Label, Card, Alert, Badge, Separator, DropdownMenu, Tooltip, Dialog, Collapsible, ScrollArea) power login, shell chrome, ticket chrome, recent-orders recall, and per-order menus.

## Custom Flow UI

Domain ticket layout (shot columns, milk wraps, allergen hazard stripes) stays app-local Tailwind + thin CSS helpers in `src/index.css`. For new interactive custom pieces, prefer composing **Base UI** / shadcn primitives under `components/ui` rather than inventing a parallel CSS system.

**Ready chrome** is line-driven (`allMade`) so promote and demote are optimistic both ways; status POSTs are debounced (~250ms) and idempotent in `useKdsOrders`. **Timer** badges use `d` / `h` / `m` (no seconds). **Food strip** is a muted slate-blue accent between drinks and food rows.

**Recent orders** (header button) opens a tablet-sized `Dialog` listing the last 20 completed tickets (`GET /kds/orders/recent`). Rows expand via `Collapsible` for full line details; **Recall** calls `POST /kds/orders/:id/recall` and returns the ticket to the board as `confirmed`.

## Adding components

From `apps/moonshot-kds`:

```bash
pnpm dlx shadcn@latest add <component> -y --cwd apps/moonshot-kds
```
