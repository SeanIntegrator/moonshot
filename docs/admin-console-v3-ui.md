# Admin console v3 — UI foundation

The signed-in admin is an eight-tab console. Login / signup / onboarding stay on
`signupTheme` + `BrandShell`.

## Cutover

Signed-in `/` redirects to `/overview` (search preserved, including
`?stripeConnect=return`). Login, signup, and onboarding-complete also land on
`/overview`. The legacy dashboard ([DashboardPage.tsx](../apps/moonshot-admin/src/pages/DashboardPage.tsx))
stays in the tree as a reference and is not routed.

Tabs:

`/overview` · `/stock` · `/menu` · `/hours` · `/order-ahead` · `/kitchen` · `/brand` · `/reports`

Overview, Brand, Reports, Hours, Order ahead, Kitchen, Stock, and Menu are real
pages. Pause, hours date overrides, last-order-ahead buffer, featured ordering,
and KDS mark-out are still deferred. The Hours sidebar shows open/closed from
weekly hours only.

## Stack

MUI v9 with a full `dashboardTheme` ([dashboardTheme.ts](../apps/moonshot-admin/src/theme/dashboardTheme.ts)).
Tokens are `theme.console` ([console-tokens.ts](../apps/moonshot-admin/src/theme/console-tokens.ts)).

## Layout

- [AdminShell.tsx](../apps/moonshot-admin/src/console/AdminShell.tsx) — wordmark, café name, status pill, email, sign out, underline tabs
- [CafeProvider.tsx](../apps/moonshot-admin/src/console/CafeProvider.tsx) — one `GET /cafe/:slug`, `patchSettings`, `reload`, client `cafeOpenStatus`
- Status pill: [service-status.ts](../apps/moonshot-admin/src/console/service-status.ts) (hours-derived until `paused_until` exists)
- Kitchen is two-column from `md` up: Pickup + Alerts | Kitchen display + Access ([KitchenPage.tsx](../apps/moonshot-admin/src/console/pages/KitchenPage.tsx))

## Conventions

- Switches apply immediately. Forms have one Save, disabled until dirty and valid.
- A value the user cannot change is never an input. Use `ReadOnlyPanel` + `SourceLabel` (`From Square` / `From Stripe` / `Generated for you`). Square catalogue fields (item name/prices, modifier names/prices, Just one / Any number, required, defaults, Square list attachments) follow this. Moonshot-owned lists stay editable.
- Copy is text + a Copy button (`CopyText`), never an input.
- UK only: GBP, 24-hour clock, `DD MMM` dates, en-GB. No timezone UI.
- Amber / red are stock (and Stripe/Square status dots). See tokens.

Primitives live in [apps/moonshot-admin/src/console/primitives](../apps/moonshot-admin/src/console/primitives).
