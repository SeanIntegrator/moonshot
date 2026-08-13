# Review nudge flow (single CTA)

Launch scope for Clay & Bean. Full thumbs-up/down + `feedback_responses` sentiment capture is **parked** — a single CTA shown to everyone is inherently free of rating-gating (Google ToS–aligned).

See [architecture/roadmap.md](architecture/roadmap.md) Workstream 2.

---

## Phases

| Phase | Status | What |
|-------|--------|------|
| **A** | Shipped | On KDS complete for signed-in **app** orders: increment `cafe_users.on_time_completed_orders` (2-minute grace vs `pickup_time`); when counter hits **3**, `review_nudge` is enabled, and state is `not_shown`, emit `customerReviewEligible`. |
| **B** | **Shipped (August 2026)** | Intermediate `eligible` state; Admin-configurable `reviewUrl`; order-ahead modal with one CTA; client confirms via `POST /feedback/review-prompt`. |

---

## Definitions

- **Eligible order:** `orders.source = 'app'`, transitioned to `completed` from the KDS (or equivalent) flow.
- **On-time:** `completed_at <= pickup_time + 2 minutes` (grace window). Null pickup counts as on-time (kitchen-led ETA unknown).
- **Counter:** `cafe_users.on_time_completed_orders` increments by 1 on each eligible + on-time completion (server-authoritative).

---

## Trigger

When `on_time_completed_orders` becomes **3**, `features.review_nudge.enabled` is true, and `review_prompt_state = 'not_shown'`:

1. Set `review_prompt_state = 'eligible'`.
2. Emit `customerReviewEligible` to the customer order room (payload includes `reviewUrl`) **before** `customerOrderCompleted`, so the order room is still subscribed.

Migration `030_review_prompt_eligible.sql` backfills Phase A rows that were prematurely set to `shown_positive` → `eligible`.

---

## Config

`cafes.features.review_nudge`:

```ts
interface ReviewNudgeFeatureConfig {
  enabled: boolean;
  /** Arbitrary review / ratings URL (Google, TripAdvisor, etc.). */
  reviewUrl: string | null;
  /** Legacy — readable for migration; prefer `reviewUrl`. */
  googlePlaceId?: string | null;
}
```

Admin settings PATCH accepts `featuresPatch.review_nudge` (`enabled`, `reviewUrl`). Admin UI: **Review nudge** card on the dashboard. When enabled, a resolvable URL is required (`reviewUrl` or legacy `googlePlaceId`).

URL resolution (`resolveReviewUrl` in `@moonshot/domain`): prefer `reviewUrl`; else Google write-review URL from `googlePlaceId`.

---

## Client UI

`ReviewNudgeProvider` (app-level under `CustomerEventsProvider`) opens a modal when:

- a `customerReviewEligible` socket event arrives, **or**
- `/auth/me` membership shows `reviewPromptState === 'eligible'`, **or**
- after `customerOrderCompleted`, `auth.refresh()` finds `eligible` (covers a missed live review event when loyalty apply overruns its budget).

| Element | Behaviour |
|---------|-----------|
| Copy | “How was your visit?” |
| Primary CTA | Opens `reviewUrl` in a new tab, then POST `opened_url` |
| Dismiss | POST `dismissed` without opening the URL |

---

## Persistence / API

`POST /api/v1/feedback/review-prompt`

```ts
{ action: 'opened_url' | 'dismissed' }
```

Server sets `review_prompt_state` to `shown` or `dismissed`. Already-terminal → 200 no-op. Do **not** re-show.

**Out of scope (parked):**

- Thumbs up / thumbs down
- `mailto:` to `owner_feedback_email`
- `feedback_responses` table
- Sentiment-gated Google routing

---

## Socket event

```ts
{
  type: 'customerReviewEligible',
  orderId: string,
  cafeId: string,
  reviewUrl: string | null,
}
```

---

## Compliance

- Every eligible user sees the same CTA — no path that sends only high ratings to an external review site.
- No internal negative-feedback gate that skips the public review URL.
