# Roadmap vs current

| Initiative | Notes |
|------------|-------|
| **Guest pay-in-store + KDS board + realtime customer completion** | Shipped when `paymentProvider === 'pay_in_store'`. |
| **Stripe Checkout + webhook confirmation** | Shipped for `paymentProvider === 'stripe'`: pending order + Checkout URL, webhook confirms paid → KDS (`dataflow-sequences.md` F2). F3 merge flow still planned. |
| **Modifier selection & validation** | Server validates `groupId`/`optionId` against menu JSON; UI pickers still a separate workstream. |
| **Pickup ETA** | FIFO recomputation + `kds:eta:updated` / `customerEtaUpdated` wired; formula from `cafes.kds_config.eta`. |
| **POS adapter / Square ingress** | Manual adapter + `posConfig` hook only; see [pos-normalisation.md](pos-normalisation.md). |
| **Admin app operations** | Pre-seeded admin login + Stripe Connect card + settings/menu PATCH. Full create/delete menu UI, invites, audit remain planned. |
| **Loyalty + review prompts** | Counter-based MVP on `cafe_users` + `customerReviewEligible` socket; persistence/ledger still thin. |
| **KDS session recovery** | 90d JWT; KDS PWA clears session on HTTP 401 (`SESSION_EXPIRED`). |

Changelog flavour + snags live in **progress.md**. Architecture invariants stay in **architecture/overview.md**.
