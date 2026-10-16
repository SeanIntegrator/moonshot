# Café onboarding

Self-service signup replaces manual DB seeding and bootstrap scripts for new cafés.

## Flow

Four steps before the dashboard — all on the light console design language
(`dashboardTheme` + `OnboardingShell`). Login may still use `BrandShell` /
`signupTheme`; signup and onboarding no longer switch themes mid-journey.

```mermaid
flowchart TD
  Marketing[moonshot-marketing] --> Signup[admin /signup]
  Signup --> Register[POST /admin/onboarding/register]
  Register --> DB[(cafes + admin_users + barista kds_users)]
  Register --> JWT[Admin JWT]
  JWT --> Menu[/onboarding Menu]
  Menu -->|Square OAuth| SquareReturn[import-pos auto-import]
  SquareReturn --> CafeSetup
  Menu -->|Guided template| CafeSetup[/onboarding Café setup]
  CafeSetup -->|POST cafe-settings| Payments[/onboarding Payments]
  Payments -->|Stripe or skip| Complete[POST /complete]
  Complete --> Dash[Dashboard]
```

| Screen | What the owner does |
|--------|---------------------|
| Account (`/signup`) | Café name, email, password, confirm password |
| Menu | Connect Square (OAuth + auto-import) or guided starter template (categories + key prices) |
| Café setup | Brand pack / colour / font + weekly opening hours + last-order buffer (explicit confirm) |
| Payments | Connect with Stripe, or skip now and add later |

Progress is **server-derived** from `GET /admin/onboarding/status`
(`hasMenuItem` → `hasCafeSettings` → payments). Refresh / OAuth return recover
the correct step without trusting `sessionStorage`.

## Brand theme

| Surface | Audience | Visual |
|---------|----------|--------|
| Signup + onboarding | Café owners | Light console (`dashboardTheme`, IBM Plex, ink CTAs) via `OnboardingShell` |
| Login | Café owners | May still use dark `signupTheme` + `BrandShell` |
| Dashboard (post-onboarding) | Café owners | Light MUI (`dashboardTheme` + `AdminShell`) |
| `moonshot-order-ahead` themes | End customers | White-label packs (`minimal`, `organic`, `lively`) + brand colour / heading font |

Auth publishes session only after onboarding status resolves, so the console
never flashes between register and `/onboarding`.

## API endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `GET` | `/admin/onboarding/slug-available?slug=` | Public, rate-limited | Debounced slug check for signup URL preview |
| `POST` | `/admin/onboarding/register` | Public, rate-limited | Create café + admin + barista KDS user; slug optional (derived from name) |
| `GET` | `/admin/onboarding/status` | Admin JWT | `completed`, `hasKdsUser`, `hasMenuItem`, `hasCafeSettings` |
| `POST` | `/admin/onboarding/cafe-settings` | Admin JWT | Save brand + hours and stamp `onboarding_cafe_settings_confirmed_at` |
| `POST` | `/admin/onboarding/kds-users` | Admin JWT | Create/rotate KDS login; omit `password` to generate one (returned once) |
| `POST` | `/admin/onboarding/menu-template` | Admin JWT | Apply starter drink/milk/syrup template (transactional) |
| `POST` | `/admin/onboarding/menu-pos-import` | Admin JWT | Import menu from connected Square (Catalog → Postgres) |
| `POST` | `/admin/connect/square/onboard` | Admin JWT | Start Square OAuth (authorize URL) |
| `GET` | `/admin/connect/square/return` | Public (signed state) | Square OAuth code exchange |
| `GET` | `/admin/connect/square/status` | Admin JWT | Square connection + locations |
| `POST` | `/admin/onboarding/complete` | Admin JWT | Set `features.onboarding_completed_at` (requires menu + café settings) |

### Register body

```ts
{ cafeName: string; email: string; password: string; cafeSlug?: string; timezone?: string }
```

- **Slug:** when omitted, derived via `deriveCafeSlugFromName` and allocated (`slug`, `slug-2`, …) server-side.
- **Timezone:** defaults to `Europe/London`.
- **Kitchen login:** a `barista` KDS user is seeded in the same transaction (password not returned — generate from the dashboard).

### Café settings body

```ts
{
  themeId: 'minimal' | 'organic' | 'lively';
  brand: { color?: string | null; headingFontId?: string | null } | null;
  hours: CafeHours;
  lastOrderBufferMinutes: 0 | 10 | 15 | 20 | 30 | 45 | 60;
}
```

Reuses the same validation as `PATCH /admin/settings`, then sets
`features.onboarding_cafe_settings_confirmed_at` so seeded hours alone cannot
skip the café setup step.

## Default policy for new cafés

Provisioned via [`cafe-provisioning.ts`](../apps/moonshot-api/src/lib/cafe/cafe-provisioning.ts):

- `pos_provider`: `manual` (switches to Square after OAuth connect / POS import)
- `theme_id`: `organic`
- `timezone`: `Europe/London` (no signup field)
- Slug: derived from café name; collisions get `-2`, `-3`, …
- Kitchen login: `barista` user seeded at signup (password rotatable from dashboard **Your café links** card)
- `order_ahead.enabled`: `true`
- `order_ahead.paymentProvider`: `pay_in_store` (switch to Stripe after Connect onboarding)
- `loyalty.enabled`: `true` (10 stamps → free drink; `doubleStampDays: []`)
- `onboarding_completed_at` / `onboarding_cafe_settings_confirmed_at`: `null`
- Other feature blocks (`events`, `promotions`, `review_nudge`, `saved_orders`, `whatsapp_ordering`): `null` (disabled)
- `kds_config`: seed template from migration `001_initial_schema.sql`, with `cafeId` set to row UUID
- Modifier library (`Milks`, `Syrups`, Flow prep, Ice Level, Toppings) seeded at signup; system menu sections (`hot_drinks`, `cold_drinks`, `food` disabled) created; platform drink-archetype recipes written to `drink_archetype_config`
- Weekly hours seeded as Mon–Sat 08:00–16:00 / Sun closed — owners must confirm on the café setup step

## Menu step

Owners choose **Import from Square** or **Start with a Moonshot menu**.

- **Square:** button starts OAuth immediately. On return, auto-import when there is at most one location; multi-location cafés see a picker. Then advance to café setup.
- **Template (guided):** toggle categories (Hot drinks and Milks always on; Food off by default), tick items, then review key prices. Names/descriptions use catalog defaults — refine later in the console.

Custom specialty sections (e.g. Ube) are added later from the dashboard Items tab.

### Menu provisioning layer

| Source | Provisioner | Payload | Persistence |
|--------|-------------|---------|-------------|
| `template` | `templateMenuProvisioner` | `AdminSaveMenuTemplateRequest` | `applyMenuTemplate` |
| `pos` | `posImportMenuProvisioner` | `PosMenuProvisionPayload` | Square `fetchMenu` → `persistNormalisedMenuCatalog` |

`POST /admin/onboarding/menu-template` delegates to `getMenuProvisioner('template')`.
`POST /admin/onboarding/menu-pos-import` delegates to `getMenuProvisioner('pos')`.

Completion requires `hasMenuItem` and `hasCafeSettings`. `hasKdsUser` is always true for new signups because the barista login is seeded at register.

### Default drink images

When Railway Object Storage is configured (`MENU_IMAGE_*` env vars), template drinks get `image_url` pointing at canonical thumbnails under `template/drinks/{key}.webp`. See **[menu-images.md](./menu-images.md)** for bucket setup, upload API, and the `pnpm sync:menu-template-images` bootstrap script.

## Payments step

Exactly two actions:

1. **Connect with Stripe** — full-page Account Link; status auto-refreshes on return; charges enabled completes onboarding.
2. **Skip now and add later** — completes onboarding with `pay_in_store`.

No refresh icon or separate Finish button.

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
| Marketing | `VITE_ADMIN_SIGNUP_URL` | `https://moonshotadmin-production.up.railway.app/signup` |
| Marketing | `VITE_ADMIN_LOGIN_URL` | `https://moonshotadmin-production.up.railway.app/login` |
| Admin | `VITE_ORDER_AHEAD_BASE_URL` | `https://order.moonshot.app` |
| Admin | `VITE_KDS_BASE_URL` | `https://kds.moonshot.app` |
| Admin | `VITE_MARKETING_URL` | `https://moonshotmarketing-production.up.railway.app` |
| API | `CORS_ORIGINS` | Include marketing, admin, and order-ahead origins |

## Legacy bootstrap

`bootstrap-admin-user.ts` and `bootstrap-kds-user.ts` remain for ops/recovery but are not required for new signups.
