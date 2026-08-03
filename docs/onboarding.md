# Café onboarding

Self-service signup replaces manual DB seeding and bootstrap scripts for new cafés.

## Flow

Four screens before the dashboard — all on the dark/lime brand theme. The light dashboard theme only appears after onboarding completes.

```mermaid
flowchart TD
  Marketing[moonshot-marketing] --> Signup[admin /signup]
  Signup --> Register[POST /admin/onboarding/register]
  Register --> DB[(cafes + admin_users + barista kds_users)]
  Register --> JWT[Admin JWT]
  JWT --> Menu[/onboarding Menu]
  Menu -->|Square OAuth| SquareReturn[import-pos auto-import]
  SquareReturn --> Payments
  Menu -->|Template| Payments[/onboarding Payments]
  Payments -->|Stripe or skip| Complete[POST /complete]
  Complete --> Dash[Dashboard]
```

| Screen | What the owner does |
|--------|---------------------|
| Login | Email + password |
| Signup | Café name, email, password, confirm password |
| Menu | Connect Square (OAuth + auto-import) or build a starter template |
| Payments | Connect Stripe, or skip for pay-in-store — then enter dashboard |

Removed from the old journey: separate café / account / confirm signup steps, Welcome, Kitchen login, Square authorise interstitial, Go live.

## Brand theme

| Surface | Audience | Visual |
|---------|----------|--------|
| Login, signup, onboarding | Café owners | Dark editorial (`signupTheme` — chartreuse accent, Syne headings) via `BrandShell` |
| Dashboard (post-onboarding) | Café owners | Light MUI (`dashboardTheme`) |
| `moonshot-order-ahead` themes | End customers | Warm white-label (`heritage`, `botanical`, etc.) |

The dark theme spans the whole pre-dashboard journey so owners never see a mid-flow theme flip.

## API endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `GET` | `/admin/onboarding/slug-available?slug=` | Public, rate-limited | Debounced slug check for signup URL preview |
| `POST` | `/admin/onboarding/register` | Public, rate-limited | Create café + admin + barista KDS user; slug optional (derived from name) |
| `GET` | `/admin/onboarding/status` | Admin JWT | `completed`, `hasKdsUser`, `hasMenuItem` |
| `POST` | `/admin/onboarding/kds-users` | Admin JWT | Create/rotate KDS login; omit `password` to generate one (returned once) |
| `POST` | `/admin/onboarding/menu-template` | Admin JWT | Apply starter drink/milk/syrup template (transactional) |
| `POST` | `/admin/onboarding/menu-pos-import` | Admin JWT | Import menu from connected Square (Catalog → Postgres) |
| `POST` | `/admin/connect/square/onboard` | Admin JWT | Start Square OAuth (authorize URL) |
| `GET` | `/admin/connect/square/return` | Public (signed state) | Square OAuth code exchange |
| `GET` | `/admin/connect/square/status` | Admin JWT | Square connection + locations |
| `POST` | `/admin/onboarding/complete` | Admin JWT | Set `features.onboarding_completed_at` |

### Register body

```ts
{ cafeName: string; email: string; password: string; cafeSlug?: string; timezone?: string }
```

- **Slug:** when omitted, derived via `deriveCafeSlugFromName` and allocated (`slug`, `slug-2`, …) server-side.
- **Timezone:** defaults to `Europe/London`.
- **Kitchen login:** a `barista` KDS user is seeded in the same transaction (password not returned — generate from the dashboard).

### KDS users body

```ts
{ username?: string; password?: string }  // username defaults to barista; omit password to generate
```

Response includes `password` only when the server generated one.

## Default policy for new cafés

Provisioned via [`cafe-provisioning.ts`](../apps/moonshot-api/src/lib/cafe/cafe-provisioning.ts):

- `pos_provider`: `manual` (switches to Square after OAuth connect / POS import)
- `theme_id`: `heritage`
- `timezone`: `Europe/London` (no signup field)
- Slug: derived from café name; collisions get `-2`, `-3`, …
- Kitchen login: `barista` user seeded at signup (password rotatable from dashboard **Your café links** card)
- `order_ahead.enabled`: `true`
- `order_ahead.paymentProvider`: `pay_in_store` (switch to Stripe after Connect onboarding)
- `loyalty.enabled`: `true` (10 stamps → free drink; `doubleStampDays: []`)
- Other feature blocks (`events`, `promotions`, `review_nudge`, `saved_orders`, `whatsapp_ordering`): `null` (disabled)
- `kds_config`: seed template from migration `001_initial_schema.sql`, with `cafeId` set to row UUID
- Modifier library (`Milks`, `Syrups`, Flow prep, Ice Level, Toppings) seeded at signup; system menu sections (`hot_drinks`, `cold_drinks`, `food` disabled) created; platform drink-archetype recipes written to `drink_archetype_config`

## Menu step

Owners choose **Connect my menu with Square** or **Continue with template**.

- **Square:** button starts OAuth immediately (no interstitial). On return, auto-import when there is at most one location; multi-location cafés see a picker. Then advance to Payments.
- **Template:** toggle categories (Hot drinks and Milks are always on; **Food** is present but off by default), tick drinks/milks/syrups, edit names/prices before save.

Custom specialty sections (e.g. Ube) are added later from the dashboard Items tab.

### Menu provisioning layer

| Source | Provisioner | Payload | Persistence |
|--------|-------------|---------|-------------|
| `template` | `templateMenuProvisioner` | `AdminSaveMenuTemplateRequest` | `applyMenuTemplate` |
| `pos` | `posImportMenuProvisioner` | `PosMenuProvisionPayload` | Square `fetchMenu` → `persistNormalisedMenuCatalog` |

`POST /admin/onboarding/menu-template` delegates to `getMenuProvisioner('template')`.
`POST /admin/onboarding/menu-pos-import` delegates to `getMenuProvisioner('pos')`.

`POST /admin/onboarding/menu-template` runs in a transaction:

1. Updates `Milks` and `Syrups` modifier groups with enabled options
2. Ensures Flow prep groups (shots, beans, milk temp/texture) plus Ice Level and Toppings
3. Creates selected drink `menu_items` at £3.50 by default (non-dairy milks +50p, syrups +30p)
4. Sets each drink’s **archetype** from the template map and attaches only the modifier groups for that recipe (e.g. espresso → shots + beans; iced latte → milks + syrups + shots + ice + beans). Low-milk / tea types set `waive_milk_surcharge`

Completion still requires `hasMenuItem` (at least one available drink). `hasKdsUser` is always true for new signups because the barista login is seeded at register.

### Default drink images

When Railway Object Storage is configured (`MENU_IMAGE_*` env vars), template drinks get `image_url` pointing at canonical thumbnails under `template/drinks/{key}.webp`. See **[menu-images.md](./menu-images.md)** for bucket setup, upload API, and the `pnpm sync:menu-template-images` bootstrap script.

## Order-ahead URLs

Multi-tenant routing: `https://order.example.com/{slug}/order`

`VITE_CAFE_SLUG` remains a dev fallback when visiting `/` without a slug segment.

## Local dev ports

Pinned in each app's `vite.config.ts` (`strictPort: true` — restart `pnpm dev` if a port is still held by a zombie process):

| App | Port | URL |
|-----|------|-----|
| KDS | 5173 | `http://localhost:5173` |
| Admin | 5174 | `http://localhost:5174` |
| Marketing | 5175 | `http://localhost:5175` |
| Order-ahead | 5176 | `http://localhost:5176` |
| API | 3000 | `http://localhost:3000` |

Local `.env` examples: admin `VITE_ORDER_AHEAD_BASE_URL=http://localhost:5176`, API `STRIPE_CONNECT_ADMIN_REDIRECT_URL=http://localhost:5174/onboarding`, Square vars in [square-oauth.md](./square-oauth.md).

## Deployment env vars

| App | Variable | Example |
|-----|----------|---------|
| Marketing | `VITE_ADMIN_SIGNUP_URL` | `https://admin.moonshot.app/signup` |
| Marketing | `VITE_ADMIN_LOGIN_URL` | `https://admin.moonshot.app/login` |
| Admin | `VITE_ORDER_AHEAD_BASE_URL` | `https://order.moonshot.app` |
| Admin | `VITE_KDS_BASE_URL` | `https://kds.moonshot.app` |
| Admin | `VITE_MARKETING_URL` | `https://moonshot.app` |
| API | `CORS_ORIGINS` | Include marketing, admin, and order-ahead origins |

## Legacy bootstrap

`bootstrap-admin-user.ts` and `bootstrap-kds-user.ts` remain for ops/recovery but are not required for new signups.
