# Moonshot v2 roadmap (Clay & Bean launch)

_Last rewritten: August 2026. Replaces the stale M1–M5 milestone board._

## Definition of Done for launch

Clay & Bean v2 is "released" when:

1. A customer can browse → customise → pay (Stripe) or pay-in-store → track → collect, with no dead ends or state loss on the critical path.
2. The KDS Flow board shows live orders and drives the order lifecycle reliably; completing an order updates the customer app (including the loyalty stamp card) every time.
3. C&B is connected to Square via OAuth (not hand-wired), its menu imported, and orders/webhooks flow with no duplicates.
4. Loyalty stamps accrue correctly; the review nudge is live (single CTA to a café-configured URL — no rating gate).
5. Order-ahead and KDS are installable to the home screen (standalone, no URL bar on tablet).
6. v0.1 is retired and C&B is running solely on v2.

**Already shipped** (do not re-open as launch work): happy-path order flow, Stripe Connect checkout, Square OAuth + catalog sync + token refresh cron, KDS Flow board iteration 1, preparing/ready status + ETA stretch, loyalty ledger, order-ahead theme packs (read path), self-service onboarding. See [progress.md](../progress.md) and [bugs/m1-triage.md](../bugs/m1-triage.md).

Work through the seven workstreams below as separate planned sessions, in order.

---

## Workstream 1 — Loyalty hot-update on order complete

**Status: done (August 2026).**

### Shipped behaviour

- `notifyOrderCompleted` applies loyalty **before** emitting `customerOrderCompleted`, with a 2s budget; failure or overrun still emits completion without `loyalty`.
- `applyLedgerStampAndRewards` returns `cardProgress` **and** `rewardsAvailable` (unredeemed count in the same transaction). `applyLoyaltyAfterKdsComplete` returns a discriminated `{ applied }` result.
- Optional `loyalty?: { stamps; stampsPerReward; rewardsAvailable }` on `customerOrderCompleted`.
- Order-ahead `CustomerEventsProvider` owns one shared `/customer` connection (refcounted rooms + `customer:unsubscribe`). `ActiveOrdersProvider`, `useOrderTracking`, and `LoyaltyProvider` subscribe to it; `MenuProvider` still has its own café-scoped socket.
- `LoyaltyProvider` patches the stamp card from the socket payload; when `loyalty` is absent it calls `refresh()` (not optimistic `+1` — double-stamp days and punch-card rollover make a naive increment wrong).

### Done when (met)

Completing an order on the KDS while sitting on Home moves the stamp card immediately (no refresh). A forced loyalty failure still flips the order card.

### Files

- `apps/moonshot-api/src/lib/orders/order-lifecycle-notify.ts`
- `apps/moonshot-api/src/lib/loyalty-after-kds-complete.ts`
- `apps/moonshot-api/src/lib/loyalty/apply-ledger-on-complete.ts`
- `apps/moonshot-api/src/realtime/customer-socket.ts` (`customer:unsubscribe`)
- `packages/types/src/sockets.ts`
- `apps/moonshot-order-ahead/src/providers/CustomerEventsProvider.tsx`
- `apps/moonshot-order-ahead/src/providers/LoyaltyProvider.tsx`
- `apps/moonshot-order-ahead/src/providers/ActiveOrdersProvider.tsx`
- `apps/moonshot-order-ahead/src/hooks/useOrderTracking.ts`

---

## Workstream 2 — Review nudge (single CTA)

See also [feedback-prompt-flow.md](../feedback-prompt-flow.md) (narrowed to this design).

### Current state (verified)

- Phase A API is shipped: on the 3rd on-time app order, the API may emit `customerReviewEligible`.
- **Latent bug:** at emit time the API sets `review_prompt_state = 'shown_positive'` before any UI exists. Users who hit the threshold before the modal ships are permanently excluded.
- Order-ahead does **not** listen for `customerReviewEligible`.
- Admin cannot configure review nudge — `AdminFeaturesPatch` only allows `loyalty` and `order_ahead`.
- Config today is `features.review_nudge.{ enabled, googlePlaceId }`. No `feedback_responses` table.

### Work

1. Introduce `review_prompt_state = 'eligible'` at emit time; only move to a terminal state (`shown` / `dismissed`) when the client confirms. Backfill rows that were prematurely set to `shown_positive`.
2. Replace `googlePlaceId` with `reviewUrl` (arbitrary café-configured URL). Keep reading `googlePlaceId` for migration if needed.
3. Extend `AdminFeaturesPatch` + admin settings merge to accept `review_nudge` (`enabled`, `reviewUrl`); surface in Admin UI.
4. Order-ahead modal on order-complete / Order Detail: single “Rate us” CTA opening `reviewUrl`. Drive from **both** the socket event and `/auth/me` membership (`reviewPromptState`), so a user who was on Home at completion still sees it next visit.
5. `POST /feedback/review-prompt` records the terminal state only — no sentiment capture, no mailto path, no `feedback_responses` table. A single CTA shown to everyone is inherently free of rating-gating.

### Done when

After three on-time completed app orders, every eligible user sees the modal once (socket or next visit), the CTA opens the Admin-configured URL, and dismissing/clicking marks the prompt as shown permanently.

### Files

- `apps/moonshot-api/src/lib/loyalty-after-kds-complete.ts`
- `packages/types/src/cafe.ts` (`ReviewNudgeFeatureConfig`)
- `packages/types/src/admin-settings.ts`
- `packages/types/src/sockets.ts`
- `apps/moonshot-api/src/lib/admin/admin-settings-merge.ts`
- `apps/moonshot-order-ahead/src/pages/OrderDetail.tsx` (and/or OrderConfirmed)
- Admin settings card for review nudge
- New feedback route (terminal-state only)

---

## Workstream 3 — Admin dashboard redesign

### Current state (verified)

- MUI v6 + Emotion, ~5.8k lines across 45 files. No Tailwind/shadcn.
- Two clashing themes: polished dark/lime `signupTheme` (BrandShell) vs a minimal light `dashboardTheme` (one primary colour, grey AppBar).
- Post-onboarding is a single scrolling `DashboardPage` of stacked Paper cards — no sidebar, no nested routes.
- No shared `components/ui/` primitives; styling is per-page `sx`.
- `admin-api.ts` is already a **53-line barrel** re-exporting `lib/adminApi/*` (old roadmap claim of an oversized monolith is stale). Oversized targets now: `MenuItemsPanel.tsx` (~530 lines), `adminApi/menu.ts` (~361).

### Work

1. Extend `brandPalette` in `adminTheme.ts` into a full `dashboardTheme` so signup and dashboard share one visual language.
2. Add shared primitives (`PageHeader`, `SettingsCard`, `FormRow`, `SectionNav`) to kill the repeated Paper + Typography + save-button pattern.
3. Replace the single-scroll dashboard with persistent sidebar nav and real sub-routes: Overview, Menu, Branding, Hours, Payments, KDS, Access.
4. Split oversized menu panels / API modules as they are touched (file-size guardrail).

### Done when

An owner can navigate the admin console via clear sections with consistent hierarchy and brand chrome; settings cards no longer each reinvent layout.

### Files

- `apps/moonshot-admin/src/theme/adminTheme.ts`
- `apps/moonshot-admin/src/App.tsx`
- `apps/moonshot-admin/src/pages/DashboardPage.tsx`
- New `apps/moonshot-admin/src/components/ui/*`
- `apps/moonshot-admin/src/components/menu/MenuItemsPanel.tsx`
- `apps/moonshot-admin/src/lib/adminApi/menu.ts`

---

## Workstream 4 — Café branding and theme picker

### Current state (verified)

- Read path is complete: `cafes.theme_id` + `cafes.theme_overrides` ship via `GET /cafe/:slug`; order-ahead `getTheme(themeId, themeOverrides)` deep-merges packs.
- Five packs: `heritage`, `botanical`, `minimal`, `bold`, `classic`.
- **No admin write path** — settings PATCH never updates `theme_id` / `theme_overrides`.
- **No logo field** anywhere; order-ahead has no logo render slot. Menu image upload (S3 + media proxy) is the reuse pattern.

### Work

1. Add `themeId` / `themeOverrides` to `AdminSettingsPatchBody` and the cafés UPDATE. Validate `BaseThemeId` and hex colours (manual validation — this endpoint is not zod).
2. Admin Branding page (depends on Workstream 3 shell): pack picker + colour overrides into `themeOverrides.colors.*`. Fonts already overridable via `themeOverrides.typography.webfontUrls`.
3. Logo: `cafes.logo_url` column, new object-key allowlist pattern, admin upload route, Home hero render slot. Reuse menu-image S3 / resize / proxy pipeline.
4. Keep `theme-contract.test.ts` invariant: no brand hex outside pack files.

### Done when

A café owner can pick a pack, override brand colours, upload a logo, and see the change live on order-ahead without a deploy.

### Files

- `packages/types/src/admin-settings.ts`, `packages/types/src/cafe.ts`
- `apps/moonshot-api/src/lib/admin/admin-settings-merge.ts` (+ settings service UPDATE)
- `apps/moonshot-api/src/lib/menu/menu-image-object-key.ts`
- Admin Branding page
- `apps/moonshot-order-ahead/src/themes/*`, Home / PageHeader logo slot
- New migration for `cafes.logo_url`

---

## Workstream 5 — Order-ahead installability

**Status: done (August 2026).**

- Full `manifest.json` with 192/512 icons (incl. maskable) + `apple-touch-icon`.
- Apple / theme-color meta in `index.html` (`apple-mobile-web-app-capable`, etc.).
- `vite-plugin-pwa` with `registerType: 'autoUpdate'`; `/runtime-config.js` is NetworkOnly and excluded from precache.

### Done when (met)

A customer can Add to Home Screen on iOS and Android and launch fullscreen without a browser chrome URL bar.

### Files

- `apps/moonshot-order-ahead/vite.config.ts`
- `apps/moonshot-order-ahead/public/manifest.json`
- `apps/moonshot-order-ahead/index.html`
- Icon assets under `apps/moonshot-order-ahead/public/`

---

## Workstream 6 — KDS notes + iPad install

### Notes — done (August 2026)

- Line-level Square notes render in the right (allergen) column on drink/food rows as **plain off-white** text (`#e8eef2`), right-aligned; allergens keep yellow chrome.
- Order-level `order.note` renders on the live `OrderCard` footer strip (and Recent Orders).
- Empty / whitespace notes normalise to `null` at Square normaliser + POS ingress.
- Failed `fetchSquareOrder` still opens a stub ticket; empty-snapshot path and adapter catch now warn/log for ops.

### Install — done (August 2026)

- Web App Manifest (`display: standalone`) + icons + Apple meta tags on the KDS SPA.
- **No service worker** on KDS — iPad Add-to-Home-Screen does not need one; avoids SW cache risk on the kitchen device.
- Ops: after Add to Home Screen, use **Guided Access** for shift lockdown. Capacitor stays parked.
- Safari tabs still show the URL bar by design — only the home-screen icon launches fullscreen.

### Work remaining

None for launch install. Parked: Capacitor / native wrapper.

### Done when (met)

- A Square order with free-text notes (order and/or line) shows them on the live board.
- KDS Add-to-Home-Screen on iPad runs fullscreen without a URL bar.

### Files

- `apps/moonshot-kds/src/board/OrderCard.tsx`, `DrinkRow.tsx`, `FoodRow.tsx`
- `apps/moonshot-api/src/lib/pos-adapters/square/order-normalise.ts` (+ tests)
- `apps/moonshot-api/src/lib/orders/pos-order-ingress.ts`
- `apps/moonshot-kds/index.html`, `public/manifest.json`, icons

---

## Workstream 7 — C&B cutover and go-live

Ops checklist (low build cost). Do after Workstreams 1–6 are green enough for a real shift.

- [ ] Disable legacy / hand-wired Square token and any per-location webhook; C&B runs OAuth-only.
- [ ] Confirm no duplicate order events after cutover.
- [ ] Confirm Square **production** webhook signature verification is live.
- [ ] Rate-limit public register / abuse surfaces; review KDS JWT lifetime.
- [ ] Barista test on the real C&B iPad during a real service.
- [ ] Decommission v0.1; C&B on v2 only.

### Done when

C&B is on v2 only with OAuth Square, no duplicate POS events, and one clean live shift with no showstoppers.

---

## Post-launch (parked — do not pull into launch)

| Item | Notes |
|------|--------|
| Lightspeed (K-Series) adapter | Gated on partner access |
| Embedded Stripe Elements + Apple/Google Pay | Faster checkout |
| Stripe refunds | Paid cancel currently sets `refundPending` only |
| Redis Socket.io adapter | Required before multi-instance API. Classic `@socket.io/redis-adapter` is incompatible with `connectionStateRecovery` / `SessionAwareAdapter` — use a Redis Streams adapter (or drop recovery) |
| KDS hold / `layout.columns` grouping / synced line made-state | Board polish beyond iteration 1 |
| KDS audio alerts; offline (SW + IndexedDB) | After installable shell |
| Admin invites, audit trail, orders/analytics views | Beyond branding shell |
| Profile prefs; pickup reschedule | Order-ahead niceties |
| Capacitor / native KDS wrapper | Only if standalone PWA + Guided Access prove insufficient |
| Menu engineering report tool | Separate opt-in product |

---

## Verified corrections (old docs were wrong)

| Claim | Reality |
|-------|---------|
| M1 happy-path cards still open on the old board | Closed — see [bugs/m1-triage.md](../bugs/m1-triage.md) |
| Split oversized `admin-api.ts` | Already a barrel; bulk lives in `adminApi/menu.ts` + menu panels |
| KDS is a “PWA shell” | Vite SPA + manifest / Apple meta for iPad A2HS (no SW); order-ahead has full PWA SW |
| Café theme editor is only “post-launch polish” | Read path shipped; write path is launch Workstream 4 |
| Review nudge needs thumbs up/down + `feedback_responses` | Launch scope is single CTA to configurable URL (Workstream 2) |
| Square line notes untested / possibly unmapped | Line notes mapped + plain off-white in allergen column; order-level notes on live `OrderCard` (WS6 notes done; install remaining) |

---

## Cross-app dependencies

```mermaid
flowchart LR
  WS1[WS1 Loyalty hot-update] --> WS2[WS2 Review nudge]
  WS3[WS3 Admin redesign] --> WS4[WS4 Branding picker]
  WS5[WS5 Order-ahead install]
  WS6[WS6 KDS notes + iPad install]
  WS1 --> WS7[WS7 C and B cutover]
  WS2 --> WS7
  WS4 --> WS7
  WS5 --> WS7
  WS6 --> WS7
```

- Loyalty stamp payload on `customerOrderCompleted` (WS1 — **done**) lands before relying on Home-during-complete for the review modal (WS2).
- Branding admin UI (WS4) sits on the redesigned shell (WS3).
- Cutover (WS7) waits on product workstreams being good enough for a live shift.
