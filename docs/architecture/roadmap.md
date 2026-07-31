Definition of Done for launch

Clay & Bean v2 is "released" when:

A customer can browse → customise → pay (Stripe) or pay-in-store → track → collect, with no dead ends or state loss on the critical path.
The KDS shows the row-based board with live orders and drives the order lifecycle reliably; completing an order updates the customer app every time.
C&B is connected to Square via OAuth (not hand-wired), its menu imported, and orders/webhooks flow with no duplicates.
Loyalty stamps accrue correctly per C&B's config; the review nudge is live and ToS-compliant.
v0.1 is retired and C&B is running solely on v2.
M1 — Stabilise the happy path

Fix what's already built and buggy before building anything new on top of it. Mostly Bug / Launch-blocker.

 [KDS] [API] Fix order-complete not always updating the order-ahead UI. Done when: marking any order Done on the KDS reliably moves the customer's tracker to the next state within seconds, across repeated tries.
 [Order-ahead] Fix the Stripe redirect landing on the wrong URL. Done when: success and cancel both return to the correct café-scoped route on production.
 [Order-ahead] Clear the cart on confirmed order return from Stripe. Done when: returning from a completed payment leaves an empty cart — no duplicate-order risk.
 [Order-ahead] Persist cart across refresh and redirect (sessionStorage), and preserve it on Stripe cancel. Done when: cancelling checkout or refreshing mid-flow keeps the basket intact. (This was a named v0.1 lesson — don't let it survive into v2.)
 [Order-ahead] [API] Actually send pickup time on POST /orders. Done when: the pickup time chosen at checkout is stored on the order and shown on the KDS, not just displayed client-side.
 [Order-ahead] Gate the home UI on activeFeatures and real open/closed status instead of hardcoding "open." Done when: a closed café or a disabled feature reflects correctly on the home screen.
 [Order-ahead] Triage remaining UI bugs (images, navigation, state) into individual cards. Done when: each known glitch is its own card with a repro, not a vague "polish" blob.
M2 — KDS row-based board (the differentiator)

The infrastructure is nearly there; this is largely the UI build the master spec already defines. Mostly Feature.

API / contracts (shipped — see [kds-board.md](kds-board.md)):

 [API] Chip metadata on read (`colorHex` / `chipLabel` / `isSize` / `isDefault`); `category` on order lines; `deriveFlowLine` + `deriveLinePrep`; seeded Shots/Beans/Milk Temperature/Milk Texture; `GET /kds/config`.
 [KDS] [API] Introduce preparing and ready states. Done when: API advances confirmed → preparing → ready; customer stepper follows via `customerOrderStatusUpdated` / poll.
 [API] [Order-ahead] Feed ETA changes from KDS back to the customer app. Done when: barista stretch API sets `eta_mode=manual_override` and FIFO does not clobber; customer receives `customerEtaUpdated`.

Board UI (iteration 1 shipped):

 [x] [KDS] Flow row-based layout: drinks then food, shot / milk / notes columns, qty bar, size underline, food divider.
 [x] [KDS] Chip taxonomy: square milk (+ italic temp/texture), round syrups; bean-coloured `[shot · bean]` brackets (defaults hidden).
 [x] [KDS] Allergen warnings with yellow/black striped border; free-text notes in italics.
 [x] [KDS] Hybrid countdown/count-up timer (green → amber → red); ticket kinds SIT IN / TAKEAWAY / PICKUP.
 [ ] [KDS] Order-type grouping / layout.columns from config; recall & hold (later).
 [ ] [KDS] Synced per-line made-state; preparing/ready chrome (later).
M3 — Square OAuth onboarding + C&B cutover

The OAuth step. Built and debugged against C&B specifically. Feature + one critical Chore (the refresh job).

 [x] [API] Implement Square OAuth code flow: /connect/onboard, /connect/return, /connect/refresh. Done when: a café can authorise from Admin and land back with tokens stored. *(onboard + return shipped; refresh endpoint is the scheduled job follow-up)*
 [x] [API] Store access + refresh tokens encrypted, per café. Done when: tokens are never in plaintext at rest and are keyed to the café.
 [x] [API] [Chore] Stand up a scheduled token-refresh job (renew every ≤7 days) with a stale-token alert if a token older than ~8 days is ever loaded. Done when: a café's connection survives past 30 days untouched. (This is the silent-killer bug — everything works for a month then dies without it. Treat it as launch-blocking, not optional.)
 [x] [API] Create the app-level webhook subscription (one notification URL, one signature key) and verify signatures. Done when: events from any connected café hit one endpoint, tagged by merchant_id, and bad signatures are rejected.
 [x] [Admin] Add the front-door buttons: "Connect my menu with Square" (Square adapter) vs "Continue with template" (manual adapter). Done when: each routes to the correct onboarding path.
 [x] [API] [Admin] Wire "Import menu from POS": OAuth token → Catalog API → Square adapter → normalise → Postgres. Done when: the currently-dead import button pulls a café's live Square menu in.
 [ ] [API] [Cross-cutting] C&B migration: retire the hand-wired token and any legacy per-location webhook, cut C&B over to OAuth, confirm no duplicate order events. Done when: C&B runs entirely through the OAuth connection with dedup verified.
M4 — Loyalty, review nudge & launch features

Ledger exists; this is config surfacing + compliance. Feature + Bug.

 [API] [Admin] [Order-ahead] Verify per-café loyalty config end-to-end (stamps-per-reward from Admin flows to accrual and to the stamp card). Done when: changing C&B's stamp count in Admin changes behaviour everywhere with no code edit.
 [API] Decide + implement C&B's loyalty rules for launch: plain N-stamp, or with double-stamp days / minimum order. Done when: the rule set C&B actually wants is live (defer the rest).
 [API] Harden loyalty-on-complete against silent failure; keep the replay tool as the safety net. Done when: a post-complete loyalty failure is logged and recoverable, not lost.
 [Order-ahead] [API] Ship the review nudge — ToS-compliant: all users see the prompt, no rating-gating, internal feedback and Google review fully decoupled. Done when: every completed order can trigger the prompt regardless of sentiment.
M5 — Launch hardening & go-live

Cross-app. Chore + Bug.

 [API] Confirm Square production webhook signature verification is live (outstanding from v0.1).
 [API] [Cross-cutting] Basic hardening: rate-limit the public register/abuse surfaces; review KDS JWT lifetime. Done when: obvious abuse vectors are closed for a single-café launch.
 [Order-ahead] PWA basics: installable, manifest correct. Done when: a new user can add-to-home-screen cleanly.
 [KDS] [Cross-cutting] Barista test at Clay & Bean on the real device during a real service. Done when: a shift runs on v2 with no showstoppers.
 [Cross-cutting] v0.1 retirement / cutover plan executed. Done when: C&B is on v2 only and v0.1 is decommissioned.
Post-Launch (parked — do not pull into launch)

Everything here is real and worth doing, but none of it blocks C&B going live. Kept visible so it's off your plate without being forgotten.

 [API] [Admin] Lightspeed (K-Series) adapter + third onboarding button. (Gated behind Lightspeed partner access.)
 [Order-ahead] Embedded Stripe Elements + one-click Apple/Google Pay (faster checkout).
 [Admin] Café profile/theme editor, payment-provider + order-ahead toggles, orders/analytics views.
 [API] Stripe refunds (currently paid-cancel only flags refundPending).
 [API] [Chore] Redis Socket.io adapter for multi-instance safety (needed before scaling beyond one node).
 [API] [Chore] Break up menu.ts inline SQL; split oversized admin-api.ts / menu panels.
 [Order-ahead] Multi-reward picker (done: type-aware apply, cheapest matching line, Applicable/Other split when one of many fits); profile prefs; pickup reschedule.
 [KDS] Audio alerts; offline resilience (Service Worker + IndexedDB).
 [Cross-cutting] Menu engineering report tool (separate, opt-in product).
 [Chore] Fix docs/READMEs that overstate current state (KDS "PWA", Admin "pre-seeded only").
Cross-app dependencies to watch

These are the places a card in one app is secretly blocked by another — flag them as Trello card links so they don't ambush you:

KDS states ↔ customer tracker: the customer app already shows Preparing/Ready (M2 KDS work must land for that stepper to be truthful).
Pickup time: UI (Order-ahead) → stored (API) → displayed (KDS) → adjustable back to customer (API → Order-ahead). One feature, four touch-points.
OAuth token refresh: an M3 API chore whose absence silently breaks menu sync and order webhooks a month after launch. Highest-leverage invisible task on the board.