# Review nudge flow (single CTA)

Launch scope for Clay & Bean. Full thumbs-up/down + `feedback_responses` sentiment capture is **parked** — a single CTA shown to everyone is inherently free of rating-gating (Google ToS–aligned).

See [architecture/roadmap.md](architecture/roadmap.md) Workstream 2.

---

## Phases

| Phase | Status | What |
|-------|--------|------|
| **A** | Shipped (with a state bug) | On KDS complete for signed-in **app** orders: increment `cafe_users.on_time_completed_orders` (2-minute grace vs `pickup_time`); when counter hits **3**, `review_nudge` is enabled, and state is `not_shown`, emit `customerReviewEligible`. |
| **B** | Planned (this doc) | Fix premature terminal state; Admin-configurable `reviewUrl`; order-ahead modal with one CTA; client confirms terminal state via `POST /feedback/review-prompt`. |

### Latent bug in Phase A

Today the API sets `review_prompt_state = 'shown_positive'` **at emit time**, before any UI exists. Users who reach three on-time orders before Phase B ships are permanently excluded. Phase B must introduce an intermediate **`eligible`** state and only move to a terminal state when the client confirms.

---

## Definitions

- **Eligible order:** `orders.source = 'app'`, transitioned to `completed` from the KDS (or equivalent) flow.
- **On-time:** `completed_at <= pickup_time + 2 minutes` (grace window). Null pickup counts as on-time (kitchen-led ETA unknown).
- **Counter:** `cafe_users.on_time_completed_orders` increments by 1 on each eligible + on-time completion (server-authoritative).

---

## Trigger

When `on_time_completed_orders` becomes **3**, `features.review_nudge.enabled` is true, and `review_prompt_state = 'not_shown'`:

1. Set `review_prompt_state = 'eligible'`.
2. Emit `customerReviewEligible` to the customer order room (payload includes `reviewUrl`).

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

Admin settings PATCH must accept `featuresPatch.review_nudge` (today only `loyalty` and `order_ahead` are whitelisted).

---

## Client UI

On Order Detail / order-complete, when either:

- a `customerReviewEligible` socket event arrives for this user, **or**
- `/auth/me` (membership) shows `reviewPromptState === 'eligible'`,

show a **modal** (not a thumbs drawer):

| Element | Behaviour |
|---------|-----------|
| Copy | Short “How was your visit?” / rate-us prompt |
| Primary CTA | Opens `reviewUrl` in a new tab (or browser) |
| Dismiss | Closes without opening the URL |

Drive from **both** socket and persisted membership so a user who was on Home at completion still sees the prompt on a later visit.

---

## Persistence / API

On CTA click or dismiss, client calls:

`POST /api/v1/feedback/review-prompt`

Body (sketch):

```ts
{ action: 'opened_url' | 'dismissed' }
```

Server sets `review_prompt_state` to a terminal value (e.g. `shown` or `dismissed`). Do **not** re-show.

**Out of scope for launch:**

- Thumbs up / thumbs down
- `mailto:` to `owner_feedback_email`
- `feedback_responses` table
- Sentiment-gated Google routing

---

## Socket event

```ts
{
  type: 'customerReviewEligible';
  orderId: string,
  cafeId: string,
  reviewUrl: string | null,
}
```

(Replace or supersede the current `googlePlaceId` field on the event.)

---

## Compliance

- Every eligible user sees the same CTA — no path that sends only high ratings to an external review site.
- No internal negative-feedback gate that skips the public review URL.
