# M1 UI bug triage

Discrete cards for remaining order-ahead / KDS / API glitches after M1 happy-path stabilisation.
Each item has a short repro. Fix outside M1 unless marked launch-blocker.

## Closed / verified in M1

| Card | Repro | Resolution |
|------|-------|------------|
| Tracker stuck after KDS Done while socket shows `tracking` | Open order detail, complete on KDS; or complete before subscribe ack | Always-on 5s poll + subscribe catch-up reload |
| Home hours / closed gating | Open Home with café closed or empty hours | `cafes.hours` + `cafeOpenStatus`; Order Now blocked when closed |
| Pickup time missing on KDS | Place order with pickup delay; check KDS card time | Card shows `pickup.pickupTime` (fallback `createdAt`) |

## Open — happy-path adjacent

| Card | Repro | Notes |
|------|-------|-------|
| Pending Stripe order on Home, absent from KDS | Start Stripe checkout, abandon before webhook/return confirms | Expected until `checkout.session.completed` or restore; see [stripe-checkout-return.md](../stripe-checkout-return.md) |
| Seed café “payments not ready” | `POST /orders` on seed café before Stripe Connect | Switch to `pay_in_store` in Admin or finish Connect |
| Guest tracker auth edge | Guest opens order detail without stored tracking JWT | `useOrderTracking` → `error`; poll still refreshes HTTP status when JWT present |

## Parked — post-M1 / later milestones

| Card | Repro | Owner |
|------|-------|-------|
| Menu item images null / placeholder | Template menu without synced images | Menu image pipeline docs |
| Paid cancel → `refundPending` only | Cancel a paid Stripe order | Post-launch Stripe refunds |
| Stepper Preparing / Ready aspirational | Tracker jumps Confirmed → Done until KDS UI calls status API | M2 API ready; board buttons in UI plan |
| Occasional loyalty miss after KDS Done | Complete succeeds; stamps missing | M4 harden + `pnpm replay:order-loyalty` |

## How to use

Copy a row into Trello/Linear as its own card with the repro in the description. Do not re-bundle into a “polish” epic.
