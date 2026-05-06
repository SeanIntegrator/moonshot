# Roadmap vs current

| Initiative | Notes |
|------------|-------|
| **Guest pay-in-store + KDS board + realtime customer completion** | Shipped (`POST /orders`, `/kds` HTTP + `/kds` Socket, `/customer` Socket + JWT validation on subscribe). |
| **Stripe Checkout + webhook confirmation** | Replaces unpaid guest path; webhook flips status + emits KDS (`dataflow-sequences.md` F2). |
| **Modifier selection & validation** | API rejects modifiers today; POS/menu schema partly ready. |
| **Pickup ETA** | Types/events exist (`kds:eta:updated`, `customerEtaUpdated`); formula in `cafes.kds_config` draft. |
| **POS adapter / Square ingress** | Walk-in parity with app orders (`dataflow-sequences.md` F1). |
| **Admin UI menu CRUD** | API routes gated by `MENU_ADMIN_EMAILS`; app shell only. |
| **Loyalty + review prompts** | `feedback-prompt-flow.md`. |
| **KDS session recovery** | JWT expiry UX when socket fails auth. |

Changelog flavour + snags live in **progress.md**. Architecture invariants stay in **architecture/overview.md**.
