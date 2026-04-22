# Review prompt flow (Google TOS–aligned)

After **three on-time completed app orders** for the same user at the same café, show a **bottom drawer** asking for a quick thumbs up / thumbs down. **Both outcomes** must offer a path to **post a public Google review** so the flow is not review-gated.

## Definitions

- **Eligible order:** `orders.source = 'app'`, transitioned to `completed` from the KDS (or equivalent) flow.
- **On-time:** `completed_at <= pickup_time + 2 minutes` (grace window).
- **Counter:** `cafe_users.on_time_completed_orders` increments by 1 on each eligible + on-time completion (server-authoritative recommended; client may optimistically animate then reconcile).

## Trigger

When `on_time_completed_orders` becomes **3** and `review_prompt_state = 'not_shown'`, open the drawer once.

## Drawer states (UI)

| State        | UI |
| ------------ | --- |
| `ask`        | Thumbs up / Thumbs down |
| `positive`   | Thanks copy + **single CTA** → Google review URL (`features.review_nudge.google_place_id`) |
| `negative`   | “Please tell us what went wrong” + **optional message** + `mailto:` to `cafes.owner_feedback_email` **and** the **same Google review CTA** as positive path |
| `dismissed`  | User closed without choosing; do not re-show (product choice) |

## Compliance notes

- No routing that sends only high ratings to Google.
- Internal negative feedback (email) is **in addition to**, not instead of, the Google CTA.

## Persistence

On any terminal action (positive chosen, negative submitted/dismissed with or without email, user dismiss):

- Set `review_prompt_state` to `shown_positive`, `shown_negative`, or `dismissed`.
- Insert `feedback_responses` row when sentiment captured (optional for dismiss-only).

## API sketch (future)

- `POST /api/v1/feedback/review-prompt` — body: `{ sentiment?, ownerMessage?, googleCtaClicked }`
- `GET /api/v1/cafe-users/me` — returns counter + state for hydration

Types: `@moonshot/types` → `feedback.ts`.
