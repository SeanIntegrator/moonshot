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

**Already shipped** (do not re-open as launch work): happy-path order flow, Stripe Connect checkout, Square OAuth + catalog sync + token refresh cron, KDS Flow board iteration 1, preparing/ready status + ETA stretch, loyalty ledger, order-ahead theme packs + Admin branding write path (logo parked), self-service onboarding. See [progress.md](../progress.md) and [bugs/m1-triage.md](../bugs/m1-triage.md).

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

See also [feedback-prompt-flow.md](../feedback-prompt-flow.md).

**Status: done (August 2026).**

- Emit sets `review_prompt_state = 'eligible'` (not premature `shown_positive`); migration `030` backfills burned rows.
- Config is `features.review_nudge.{ enabled, reviewUrl }` (legacy `googlePlaceId` still resolved).
- Admin PATCH + **Review nudge** dashboard card.
- Order-ahead `ReviewNudgeProvider` + single-CTA modal (socket + `/auth/me` + refresh on complete).
- `POST /api/v1/feedback/review-prompt` → `shown` / `dismissed` only (no thumbs / `feedback_responses`).

### Done when (met)

After three on-time completed app orders, every eligible user sees the modal once (socket, same-session refresh, or next visit), the CTA opens the Admin-configured URL, and dismissing/clicking marks the prompt permanently.

### Files

- `apps/moonshot-api/src/lib/loyalty-after-kds-complete.ts`
- `apps/moonshot-api/src/routes/feedback.ts`
- `apps/moonshot-api/migrations/sql/030_review_prompt_eligible.sql`
- `packages/types/src/cafe.ts`, `admin-settings.ts`, `sockets.ts`
- `packages/domain/src/feedback.ts`
- `apps/moonshot-api/src/lib/admin/admin-settings-merge.ts`
- `apps/moonshot-admin/src/components/ReviewNudgeSettingsCard.tsx`
- `apps/moonshot-order-ahead/src/providers/ReviewNudgeProvider.tsx`

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

**Status: done (August 2026).** Logo upload remains parked.

- Three packs in `@moonshot/domain`: `minimal` / `organic` / `lively` (legacy ids migrate / coerce).
- Brand recipe in `theme_overrides.brand` (`color`, `headingFontId`); `resolveCafeTheme` derives surfaces at runtime.
- Admin **Branding** card on the existing dashboard (WS3 shell still parked): pack picker, colour, heading font, live Home-like preview.
- Settings PATCH updates `theme_id` + `theme_overrides`; order-ahead matches without a deploy.

### Done when (met)

An owner can pick Minimal / Organic / Lively, set brand colour + heading font, preview, save, and order-ahead updates live. Logo deferred.

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
- Failed `fetchSquareOrder` (after 3 attempts) opens a **Details pending** stub and does not wipe existing lines; a later webhook fills the snapshot.

### Install — done (August 2026)

- Web App Manifest (`display: standalone`) + icons + Apple meta tags on the KDS SPA.
- **No service worker** on KDS — iPad Add-to-Home-Screen does not need one; avoids SW cache risk on the kitchen device.
- Ops: after Add to Home Screen, use **Guided Access** for shift lockdown. Capacitor stays parked.
- Safari tabs still show the URL bar by design — only the home-screen icon launches fullscreen.

### Audio — done (August 2026)

- New-order chime on `kds:order:new` (deduped against recall echoes) and a repeating overdue alarm when a ticket goes red.
- WebAudio catalogue on `kdsConfig.audio`; login submit unlocks the context; header mute + **Sound off** / **Tap to enable sound** so a silent board is never a surprise.

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
| KDS offline (SW + IndexedDB) | After installable shell |
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
| Café theme editor is only “post-launch polish” | Write path shipped (WS4); logo still parked |
| Review nudge needs thumbs up/down + `feedback_responses` | Launch scope is single CTA (WS2 **done**); thumbs / `feedback_responses` remain parked |
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

- Loyalty stamp payload on `customerOrderCompleted` (WS1 — **done**) lands before relying on Home-during-complete for the review modal (WS2 — **done**).
- Branding write path (WS4 — **done**) shipped as a dashboard card while WS3 shell redesign remains parked.
- Cutover (WS7) waits on product workstreams being good enough for a live shift.
