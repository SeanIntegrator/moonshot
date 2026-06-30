# Café onboarding

Self-service signup replaces manual DB seeding and bootstrap scripts for new cafés.

## Flow

```mermaid
flowchart TD
  Marketing[moonshot-marketing] --> Signup[admin /signup]
  Signup --> Register[POST /admin/onboarding/register]
  Register --> DB[(cafes + admin_users)]
  Register --> JWT[Admin JWT]
  JWT --> Wizard[/onboarding wizard]
  Wizard --> KDS[KDS credentials]
  Wizard --> Menu[Starter menu template]
  Wizard --> Stripe[Stripe optional]
  Wizard --> Live[order.app/slug]
```

## Brand split

| Surface | Audience | Visual |
|---------|----------|--------|
| `moonshot-marketing` + admin signup | Café owners | Dark editorial (chartreuse accent, Syne headings) |
| `moonshot-order-ahead` themes | End customers | Warm white-label (`heritage`, `botanical`, etc.) |

## API endpoints

| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| `GET` | `/admin/onboarding/slug-available?slug=` | Public, rate-limited | Debounced slug check for signup UX |
| `POST` | `/admin/onboarding/register` | Public, rate-limited | Create café + admin user, return JWT |
| `GET` | `/admin/onboarding/status` | Admin JWT | `completed`, `hasKdsUser`, `hasMenuItem` |
| `POST` | `/admin/onboarding/kds-users` | Admin JWT | Create/update KDS login for café |
| `POST` | `/admin/onboarding/menu-template` | Admin JWT | Apply starter drink/milk/syrup template (transactional) |
| `POST` | `/admin/onboarding/complete` | Admin JWT | Set `features.onboarding_completed_at` |

## Default policy for new cafés

Provisioned via [`cafe-provisioning.ts`](../apps/moonshot-api/src/lib/cafe-provisioning.ts):

- `pos_provider`: `manual`
- `theme_id`: `heritage`
- `order_ahead.enabled`: `true`
- `order_ahead.paymentProvider`: `pay_in_store` (switch to Stripe after Connect onboarding)
- All other features: `null` (disabled)
- `kds_config`: seed template from migration `001_initial_schema.sql`, with `cafeId` set to row UUID
- Modifier library (`Milks`, `Syrups`) seeded at signup; onboarding step 3 applies the owner’s template selections

## Starter menu template (onboarding step 3)

Owners choose **Edit template** or **Import from POS** (POS import UI is stubbed; API provisioner returns not-implemented).

Template path: toggle categories (Hot drinks and Milks are always on), tick individual drinks/milks/syrups, and edit names, descriptions, and prices before save.

### Menu provisioning layer

Onboarding menu creation goes through **menu provisioners** (parallel to `PosAdapter` for runtime catalogue reads):

| Source | Provisioner | Payload | Persistence |
|--------|-------------|---------|-------------|
| `template` | `templateMenuProvisioner` | `AdminSaveMenuTemplateRequest` | `applyMenuTemplate` today |
| `pos` | `posImportMenuProvisioner` | `PosMenuProvisionPayload` | `PosAdapter.fetchMenu` → `persistNormalisedMenuCatalog` (planned) |

`POST /admin/onboarding/menu-template` delegates to `getMenuProvisioner('template')`.

`persistNormalisedMenuCatalog` in `menu-catalog-persistence.ts` is the shared write path both sources will use once POS import ships.

`POST /admin/onboarding/menu-template` runs in a transaction:

1. Updates `Milks` and `Syrups` modifier groups with enabled options
2. Creates selected drink `menu_items` at £3.50 by default (non-dairy milks +50p, syrups +30p)
3. Attaches Milks to every drink; attaches Syrups when that category is enabled

Completion still requires `hasMenuItem` (at least one available drink).

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

Local `.env` examples: admin `VITE_ORDER_AHEAD_BASE_URL=http://localhost:5176`, API `STRIPE_CONNECT_ADMIN_REDIRECT_URL=http://localhost:5174/onboarding`.

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
