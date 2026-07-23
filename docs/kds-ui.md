# KDS UI (shadcn)

Kitchen Display System styling lives in `apps/moonshot-kds` only — not a shared monorepo UI package.

## Stack

- **shadcn/ui** with **Base UI** primitives (`components.json` style: `base-nova`)
- **Tailwind CSS v4** via `@tailwindcss/vite`
- **Dark** theme by default (`class="dark"` on `<html>`)
- Neutral base color + Geist Variable

Prebuilt components under `src/components/ui/` (Button, Input, Label, Card, Alert, Badge, Separator) power login, shell chrome, and ticket chrome.

## Custom Flow UI

Domain ticket layout (shot columns, milk wraps, allergen hazard stripes) stays app-local Tailwind + thin CSS helpers in `src/index.css`. For new interactive custom pieces, prefer composing **Base UI** / shadcn primitives under `components/ui` rather than inventing a parallel CSS system.

## Adding components

From `apps/moonshot-kds`:

```bash
pnpm dlx shadcn@latest add <component> -y --cwd apps/moonshot-kds
```
