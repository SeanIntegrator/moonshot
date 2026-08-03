# Order-ahead design implementation

This document captures the substantial order-ahead work completed across the recent prompts: mobile UI realignment work and loyalty reward redemption through checkout.

## Scope completed

### Frontend (order-ahead app)

- Rebuilt key customer surfaces to match the canonical mobile design direction:
  - Home, Menu, Item Detail, Order Detail, Checkout, Rewards, Profile.
- Added shared UI building blocks for consistency:
  - loyalty card, QR card/modal, current order card, section headers, quantity/modifier controls, checkout rows, order stepper, floating cart bar.
- Added route support for post-checkout confirmation and Stripe return restoration.
- Updated base MUI theme tokens and component defaults to a neutral white surface + deep navy emphasis palette for screenshot alignment.

### Backend/API (loyalty reward redemption)

- Extended order request/response contracts to support reward redemption at checkout:
  - request: `redeemRewardId`
  - response: `discountMinor`, `redeemedRewardId`
- Implemented checkout pricing logic for reward discounting using drink-line eligibility rules.
- Implemented safe reward consumption timing:
  - pay-in-store: consume in the order transaction.
  - Stripe: apply discount at checkout session creation, consume on `checkout.session.completed` webhook.
- Added loyalty summary enrichment for UI (`freeDrinksRedeemed`) and related parsing/service wiring.

## Current UX behavior

- Home now keeps loyalty and order sections visible in empty states:
  - loyalty section shows a styled placeholder when live loyalty data is not available.
  - order section shows a dedicated empty card with CTA rather than removing the section.
- Signed-in users still get full live behavior:
  - real loyalty stamps card with QR modal access.
  - active order card with status/details.

### Single active order

Customers may only have one in-progress order at a time. While `GET /orders/me` reports an active order:

- `RequireNoActiveOrder` wraps `/order`, `/order/item/:id`, and `/checkout` and redirects to `/orders/:id` with a snackbar (“Finish your current order first”).
- The Order thumb-bar tab and Home “Your usual” / “Why not try” Order buttons are disabled via `useOrderingGate().canStartNewOrder`.
- Featured menu cards are hidden so they cannot deep-link into a bounce.
- Profile reorder buttons use the same gate (they land on `/checkout`).

Centralise new “can I order?” checks in `useOrderingGate` rather than re-implementing per surface. Stripe return (`/checkout/restore`) and confirmation routes stay ungated.

## Production-complete vs wireframe-only

### Production-complete

- Loyalty redemption through pay-in-store and Stripe checkout flows.
- Reward discount application and reward consumption safeguards.
- Primary customer ordering flow UI and navigation surfaces.
- Cart persistence across Stripe redirect (`sessionStorage` per café slug) and clear on successful restore / pay-in-store.
- Customer pickup delay (`pickupDelayMinutes`) → API `requested_pickup_not_before` floor on live FIFO ETA.
- Client gating of Order / Rewards from café `activeFeatures` (`order_ahead`, `loyalty`).

### Wireframe/best-effort (intentionally non-final)

- Pickup-time **change after order placed** (reschedule).
- Some profile management rows (phone/card/notification preferences).
- Featured/menu merchandising details that require additional product data.
- Café open/closed hours on Home (wired via `cafes.hours` + `cafeOpenStatus`).

## Notes

- Keep visual styles driven by theme tokens rather than one-off per-page colors to preserve white-label theming flexibility.
- If future brand variants are introduced, extend theme layers per café without changing base interaction components.
- Styling conventions (theme vs styled vs `sx` vs CSS): see [order-ahead-styling.md](./order-ahead-styling.md).
