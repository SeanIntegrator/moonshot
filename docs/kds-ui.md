# KDS UI (shadcn)

Kitchen Display System styling lives in `apps/moonshot-kds` only — not a shared monorepo UI package.

## Stack

- **shadcn/ui** with **Base UI** primitives (`components.json` style: `base-nova`)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **Dark** theme by default (`class="dark"` on `<html>`)
- Cool grey board with layered surfaces + Geist Variable

Prebuilt components under `src/components/ui/` (Button, Input, Label, Card, Alert, Badge, Separator, DropdownMenu, Tooltip, Dialog, Collapsible, ScrollArea) power login, shell chrome, ticket chrome, recent-orders recall, and per-order menus.

## Theme tokens

Defined in `src/index.css` (`:root` + `.dark`, exposed via `@theme inline`).

**Surface stack** (chrome — shell, cards, modals, menus):

| Token | Role |
|---|---|
| `--surface` / `bg-surface` | Page / shell |
| `--surface-raised` / `bg-surface-raised` | Cards, list rows |
| `--surface-sunken` / `bg-surface-sunken` | Inset wells, scroll areas |
| `--surface-overlay` / `bg-surface-overlay` | Modal scrim |

`--background`, `--card`, and `--popover` map onto this stack so shadcn primitives inherit it (`card` → raised; `popover` → a step above for dialogs/menus).

**Semantic accents** (toasts, alerts, badges — soft fills via opacity utilities like `bg-success/15`):

| Token | Use |
|---|---|
| `--success` | Completed / positive |
| `--warning` | Caution |
| `--info` | Informational chrome |
| `--destructive` | Errors |

Badge and Alert support `success` | `warning` | `info` | `destructive` variants. Interactive chrome uses a cool blue-grey `--accent` / `--ring`; primary stays high-contrast for tablet CTAs (e.g. Recall).

Flow ticket colours (headers, timers, milk/syrup chips, allergen hazard) stay app-local hardcodes — not these chrome tokens.

## Custom Flow UI

Domain ticket layout (shot columns, milk wraps, allergen hazard stripes) stays app-local Tailwind + thin CSS helpers in `src/index.css`. For new interactive custom pieces, prefer composing **Base UI** / shadcn primitives under `components/ui` rather than inventing a parallel CSS system.

**Ready chrome** is line-driven (`allMade`) so promote and demote are optimistic both ways; status POSTs are debounced (~250ms) and idempotent in `useKdsOrders`. **Timer** badges use `d` / `h` / `m` (no seconds).

**Line grouping** (`groupKdsLines` in `@moonshot/domain`): identical lines (same item, modifiers, notes, allergens) merge into one row with summed quantity; drinks then sort by menu section (`drinkSectionKeys`) → beans → milk → other modifiers. Food merges the same way and sorts by `foodSectionKeys`. Crossing a merged row toggles every source line id together. Recent-orders recall stays unmerged (1:1 with line ids).

**Fulfillment icons** sit above the quantity in the shot column (walking = takeaway / pickup, table SVG = eat in). Preview only — all lines on a ticket currently share `order.orderType`; a future per-line cup flag slots into the same cell. Compact density hides the icon.

**Food strip** is a muted slate-blue accent between drinks and food. When every food line is crossed it turns the same forest green as the READY header. Collapse keeps rows mounted and animates `max-height` over **300ms ease-in-out** (same cadence as ticket dismiss) so tickets below slide instead of jumping.

**Line density:** `DrinkRow` / `FoodRow` accept `density="board" | "compact"` (default `board`). Compact shrinks type/padding for close-range UI and uses `.flow-allergen-sm`.

**Recent orders** (header button) opens a tablet-sized `Dialog` listing the last 20 completed tickets (`GET /kds/orders/recent`). Rows expand via `Collapsible` for full line details at **compact** density; **Recall** calls `POST /kds/orders/:id/recall` and returns the ticket to the board as `confirmed`. Modal food strip uses theme muted tokens (board strip hex unchanged).

## iPad Add to Home Screen

The KDS ships a Web App Manifest + Apple meta (`apple-mobile-web-app-capable`) so **Share → Add to Home Screen** launches fullscreen without a Safari URL bar. There is no service worker on KDS (iPad does not need one for A2HS). Pair with **Guided Access** for shift lockdown. See [architecture/kds-board.md](architecture/kds-board.md#ipad-install-clay--bean).

## Adding components

From `apps/moonshot-kds`:

```bash
pnpm dlx shadcn@latest add <component> -y --cwd apps/moonshot-kds
```
