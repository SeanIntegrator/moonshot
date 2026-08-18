# Admin console v3 — build handover

**Status: eight tabs live.** Shell, theme, café context and shared primitives live
under `apps/moonshot-admin/src/console/` — see
[admin-console-v3-ui.md](admin-console-v3-ui.md). Signed-in `/` redirects to
`/overview`. Stock and Menu are real pages.

The legacy scrolling dashboard
(`apps/moonshot-admin/src/pages/DashboardPage.tsx`) stays in the tree as a
reference and is not routed. v3 replaces it with an eight-tab console.

Read this alongside [onboarding.md](onboarding.md),
[current/http-surface.md](current/http-surface.md) and
[menu-management.md](menu-management.md).

---

## 1. Information architecture

Eight tabs, ordered by frequency of use:

`Overview · Stock · Menu · Hours · Order ahead · Kitchen · Brand · Reports`

Header: wordmark, café name + slug, live status pill, owner email, sign out.

| Tab | Frequency | Purpose |
|-----|-----------|---------|
| Overview | Daily | Status, what's out of stock, connection health. Summary + deep links. |
| Stock | Daily / mid-shift | Turn options and food on and off. |
| Menu | Monthly | Items, photos, recipes, modifier lists. |
| Hours | Occasional | Weekly hours, one-off dates, pause. |
| Order ahead | Setup | Loyalty, home-screen merchandising, payments status, links. |
| Kitchen | Setup | Pickup timing, KDS display, kitchen access. |
| Brand | Setup | Theme, colour, font, review nudge. |
| Reports | — | Placeholder only. |

---

## 2. Global conventions

### Save model — one rule

> **Switches apply immediately. Forms have a Save button.**

One Save per card, bottom-right, disabled until dirty. Never two Save buttons on
one card; never a Save button on a card containing only switches.

### Read-only field system

Five of the eight screens display values Moonshot cannot edit. The rule:

> **A value the user cannot change must never be drawn in an input-shaped control.**

Render as body text on a `#F5F6F7` panel with a `#E6E8EB` border, `cursor: default`,
no focus ring. Where a value needs copying it is **text + a Copy button**, never an
input + Copy button. Exactly three source labels, each with a lock glyph:

| Label | Applies to |
|-------|------------|
| `From Square` | POS-mirrored catalogue values (`posItemId != null`) |
| `From Stripe` | Payment account status |
| `Generated for you` | System-derived URLs, café slug, KDS username |

Derived values inline in body copy (`Right now that's 15:40.`) get no label — they
only need to not look like inputs.

### Colour semantics — stock only

| State | Colour | Meaning |
|-------|--------|---------|
| In stock | Neutral | Normal |
| Out today | Amber | Auto-returns when the café next opens |
| Out | Red | Stays off until manually restored |

The control text always states which; colour never carries meaning alone. Red and
amber are not used for any other purpose except Stripe/Square status dots.

### Locale

**UK only.** GBP, 24-hour clock, `DD MMM` dates, en-GB. No timezone UI — but note
`cafes.timezone` still exists and is used by `cafeOpenStatus` and
`stampsEarnedForCompletedOrder`; do not remove it.

---

## 3. Build status matrix

**Exists** = field, endpoint and logic are live; UI is the only work.
**Partial** = some infrastructure, needs extension.
**New** = nothing exists.

### Shell and Overview

| Feature | Status | Notes |
|---------|--------|-------|
| Eight-tab shell, routing | Exists | `/` redirects to `/overview`; login and onboarding-complete land there |
| Read-only field system | Partial | `ReadOnlyPanel` / `SourceLabel` primitives exist; pages not wired |
| Derived status line, today's hours | Exists | Overview hero + today's hours card (24h). One-off preview waits on §4.3 |
| Out-of-stock summary | Exists | Overview card from `GET /admin/stock`; deep link to `/stock` |
| **Connections card** | **Exists** | Square + Stripe rows on Overview; disconnect client included |
| Pause orders | New | §4.2 |

The Connections card needs **no new backend**:

- `GET /api/v1/admin/connect/square/status`
- `POST /api/v1/admin/connect/square/disconnect`
- `POST /api/v1/admin/menu/sync-pos`
- `GET /api/v1/admin/payments/stripe/status`
- `POST /api/v1/admin/payments/stripe/onboarding-link`

Row states to build: connected/healthy, connected/stale (>24h since sync),
not connected, expired, sync-failed. Stripe has **no disconnect action** — all
order-ahead payment goes through Stripe, so disconnecting would stop the café
trading.

### Stock

| Feature | Status | Notes |
|---------|--------|-------|
| Option availability (milks, syrups, beans) | Exists | `/stock` — side table `modifier_option_availability`; radios PATCH immediately. Square cafés only see POS-owned lists (`posGroupId` set); leftover signup templates are hidden. |
| Timed auto-return ("Out today") | Exists | `nextCafeOpenAt`; lazy expiry at read time |
| Food availability | Exists | In stock / Out only (`menu_items.is_available`); food leaves the menu |
| "on N drinks" impact counts | Exists | Join `menu_item_modifier_groups` |
| "Drinks affected right now" summary | Exists | Count on the Stock card |
| Option row icons | Exists | Phosphor SVGs per chip (cow, bean, drop, cup, spinner, cookie) |

### Menu & prices

| Feature | Status | Notes |
|---------|--------|-------|
| Item CRUD, photo upload, on-menu toggle | Exists | `/menu` — Square-linked name/price/sizes/photos in `ReadOnlyPanel` / From Square. Save + Undo sit in the item header. |
| Recipe (drink archetype) selection + apply | Exists | Drink types tab |
| `waiveMilkSurcharge` checkbox | Exists | Per-item field |
| Square lock presentation | Exists | `posItemId` / `posGroupId` (now returned on library GET) |
| Modifier list tabs (Milk, Syrup, Beans, Shots, Toppings) | Exists | POS-linked groups: names, prices, Just one / Any number, required, and defaults are read-only. Moonshot lists are editable + SaveFooter + Remove |
| `Featured` badge + deep link | Partial | Tag exists; ordering does not — §4.5 |

**Important:** POS-linked modifier groups have their `options` array rewritten on
catalog sync, including selection type, required, and defaults. Square item
attachments are also reset on sync, so offer switches for those lists are
disabled. Square-connected cafés hide leftover signup templates on Stock and
Menu (Choices and list tabs) — only lists with `posGroupId` appear. Moonshot-owned
lists stay fully editable on cafés with no POS.

### Hours

| Feature | Status | Notes |
|---------|--------|-------|
| Weekly grid, split shifts, closed days | Exists | `/hours` — SaveFooter + Undo; overlap rejected client and server |
| One-off date overrides | **New** | §4.3 |
| Last-order buffer dropdown | **New** | §4.4 |
| Pause control (mirrors Overview) | New | §4.2 |
| Validation (close before open, overlaps) | Exists | Client helper + `validateCafeHoursPatch` |

### Order ahead

| Feature | Status | Notes |
|---------|--------|-------|
| Loyalty enable + `stampsPerReward` | Exists | `/order-ahead` — switch PATCHes immediately; do not send `loyalty: null` |
| `rewardDescription` ("Reward" field) | Exists | Same loyalty form; blank rejected when enabled |
| Double stamp **weekdays** | **Exists** | `WeekdayPillGroup` emits en-GB long names |
| Double stamp **hours** | **New** | §4.6 — defer |
| `notesEnabled` toggle | Exists | Field live; omitted from v3 until the customer app has a notes field |
| Featured carousel picker (1–5, reorderable) | Partial | §4.5 |
| "Why not try" item picker | Partial | §4.7 |
| Payments status (read-only) | Exists | From Stripe panel; connect/setup stays on Overview |
| Customer order link | Exists | `Generated for you` + CopyText |

**Gotcha:** `doubleStampDays` holds **en-GB long weekday names** (`'Monday'`,
`'Tuesday'`), not the `WeekdayKey` (`'mon'`) used by `cafes.hours`. Two different
weekday formats in one screen — the pill row must emit long names.

```7:19:apps/moonshot-api/src/lib/loyalty/loyalty-rules.ts
export function stampsEarnedForCompletedOrder(params: {
  loyalty: LoyaltyFeatureConfig;
  cafeTimezone: string;
  completedAt: Date;
}): number {
  const { loyalty, cafeTimezone, completedAt } = params;
  if (!loyalty.doubleStampDays?.length) return 1;
  const weekday = new Intl.DateTimeFormat('en-GB', {
    timeZone: cafeTimezone,
    weekday: 'long',
  }).format(completedAt);
  return loyalty.doubleStampDays.includes(weekday) ? 2 : 1;
}
```

### Kitchen

| Feature | Status | Notes |
|---------|--------|-------|
| Pickup timing (`defaultPickupMinutes`, `maxPickupMinutes`) | Exists | `/kitchen` — moved from Order ahead |
| `pickupTimeEnabled` toggle | Exists | Immediate PATCH |
| Display preferences | Exists | Name, pickup time, order source — immediate switches |
| Timer thresholds (dual-handle slider) | Exists | `{ greenMax, amberMax }` |
| Audio (sound per event, volume) | Exists | Real five sounds + volume + overdue repeat |
| Layout (columns, group by) | Exists | Columns 1–6; Group by Order type / Don't group |
| "Smart order line items" toggle | **New** | `groupKdsLines` is currently unconditional |
| Kitchen access + password rotation | Exists | `POST /admin/onboarding/kds-users` |

### Brand

| Feature | Status | Notes |
|---------|--------|-------|
| Theme pack, brand colour, heading font, preview | Exists | `/brand` — SaveFooter + live Home/Prompt preview |
| Review nudge enable + `reviewUrl` | Exists | Toggle PATCHes immediately; URL is a form with client validation |
| "Asked after 3 on-time orders" | Exists (static text) | Threshold is hardcoded — do **not** make configurable |
| "Shown to N · M opened the review link" | **New** | Aggregate over `review_prompt_state` + `opened_url` confirmations |

### Reports

Placeholder screen only (`/reports`). No endpoints, no charts, no KPIs. `Open Square ↗`
is hidden when Square is not connected.

---

## 4. Data model decisions

Migration ceiling is **032** (`032_modifier_option_availability.sql`). Node-pg-migrate
wrappers exist through 032 (including previously-missing 030/031 `.cjs` entries).

### 4.1 Stock — use a side table, not the options JSON

**This is the one decision that would cause a rebuild if got wrong.**

Modifier options have no table. They live as a JSONB array on the group:

```6:13:apps/moonshot-api/migrations/sql/012_menu_modifier_library.sql
CREATE TABLE modifier_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cafe_id UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  selection_type TEXT NOT NULL DEFAULT 'single',
  required BOOLEAN NOT NULL DEFAULT FALSE,
  max_select INTEGER,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
```

`NormalisedModifierOption` has no availability field, so the obvious move is to add
`outUntil` to each option object. **Do not.** That array is rewritten for POS-linked
groups on every catalog sync — the Square webhook, the manual "Sync now" button, and
the daily stale-catalog cron (`POST /internal/pos/sync-catalogs`). Milks and syrups
are exactly the groups Square owns and exactly the things a café 86s, so a sync
would silently restore stock mid-service.

POS sync still mints new option UUIDs in the Square adapter. `upsertModifierGroup`
reuses existing JSON `id` values where `posOptionId` matches (`preserveOptionIds`),
or availability rows would orphan on every webhook. After upsert, orphan
availability rows (option no longer in any group JSON) are deleted.

Keep availability in its own table so sync and availability never touch the same
rows:

```sql
-- migration 032
-- One row per option that is currently out. Absence of a row means in stock.
CREATE TABLE modifier_option_availability (
  cafe_id   UUID NOT NULL REFERENCES cafes (id) ON DELETE CASCADE,
  option_id UUID NOT NULL,
  out_until TIMESTAMPTZ,          -- NULL = out until manually restored
  set_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (cafe_id, option_id)
);
```

State mapping:

| Row state | UI state |
|-----------|----------|
| No row | `In stock` |
| `out_until` set and in the future | `Out today` |
| `out_until` set and in the past | `In stock` (lazily expired) |
| `out_until IS NULL` | `Out` |

**Evaluate lazily at read time. No scheduler, no cron.** "Out today" resolves to
the café's next opening time, computed from `cafes.hours`.

Consumers that apply it: public `GET /menu` overlays `isAvailable` on options
(never drops them); checkout rejects 86'd selections; KDS loads `outOptionIds` on
`GET /kds/config` and greys chips on `kds:stock:updated`. Admin is the write
surface — there is no KDS mark-out control.

Food is unaffected — it already uses `menu_items.is_available`, and the design
deliberately keeps the different behaviour ("comes off the menu while out").

### 4.2 Pause — one concept, one field

There is no manual override today; open/closed is derived entirely from
`cafes.hours` via `cafeOpenStatus`. Add a single nullable timestamp
(`cafes.paused_until`) and treat closed-by-hours and paused-by-owner as **different
reasons**, because the customer app shows different copy for each.

`CafeOpenStatus` currently carries only two fields and will need extending:

```27:31:packages/types/src/cafe-hours-contract.ts
export interface CafeOpenStatus {
  isOpen: boolean;
  /** Short Home caption, e.g. `Open · closes 4:00 pm` / `Closed · opens 8:00 am`. */
  caption: string;
}
```

`cafeOpenStatus(hours, timezone, now)` in `packages/domain/src/cafe-hours.ts` is
called from the API (`routes/cafe.ts`) and the order-ahead app
(`useCafeOpenStatus.ts`). Changing its signature touches both — do it in one pass.

Durations offered: 15 min, 30 min, 1 hour, rest of today. Surfaces that must show
the paused state identically: header pill, Overview hero, Hours right rail. There
is **no separate Open/Closed toggle** anywhere — that was explicitly cut.

Customer copy: closed → `Closed · opens 08:00`; paused → `Taking a short break —
back at 15:10`.

### 4.3 One-off hours overrides

`cafes.hours` is `Record<WeekdayKey, CafeHoursInterval[]>` — a weekday map with
nowhere to hang a date. Overrides need their own shape: a date, an optional short
label, and either "closed all day" or a set of intervals. A small table keyed by
`(cafe_id, date)` is the natural fit, and it must be consulted by `cafeOpenStatus`
ahead of the weekly map.

### 4.4 Last-order buffer

New integer field (minutes before close after which no more order-ahead slots are
offered). Dropdown values: at closing time, 10, 15, 20, 30, 45, 60. Default 20.

There is no closing buffer today — `cafeOpenStatus` is binary — so this also has to
feed the customer app's slot generation, not just the admin display.

### 4.5 Featured items need an order

`featuredItems()` filters on an unordered string array:

```107:109:apps/moonshot-order-ahead/src/lib/menu-utils.ts
export function featuredItems(menu: NormalisedMenu): NormalisedMenuItem[] {
  return menu.items.filter((i) => i.isAvailable && i.tags.some((t) => t.toLowerCase() === 'featured'));
}
```

Tags cannot express order, but the design has drag-to-reorder. Store an **ordered
array of menu item ids** in café config rather than adding a rank column — one
field to write, and the 1–5 cap becomes enforceable server-side. Keep the
`isAvailable` filter so a sold-out featured item drops out of the carousel
automatically; the admin row shows an amber `Out` chip and stays in the list.

Copy fix: the design says "up to five **drinks**", but nothing restricts featured
items to drinks (the mock features a croissant). Use "items".

### 4.6 Double stamp hours — defer

Weekday selection is free. Hours are not: `stampsEarnedForCompletedOrder` takes
`completedAt`, so an hour-level window would be evaluated at KDS-complete. A
customer ordering at 15:55 inside a double-stamp window whose drink is completed at
16:02 gets one stamp and complains. Day-level granularity makes that a 4am edge
case; hour-level makes it daily.

If hours are built, the multiplier must move to **order-placed** time and the
customer's basket must show "2× stamps" so the promise is made at the point of
decision. **Ship the weekday pills first and leave the `All day` / `Set hours`
segment out of the first pass.**

### 4.7 "Why not try" item

Currently hardcoded, with the extension point already documented in the source:

```11:15:apps/moonshot-order-ahead/src/lib/why-not-try.ts
 * Hardcoded to Flat White for launch. Intended extension points:
 * - Admin-configurable featured suggestion per café
 * - Auto-recommend from ordering patterns / popularity
 */
export const WHY_NOT_TRY_ITEM_NAME = 'Flat white';
```

Replace the name lookup with a configured menu item id plus a defined fallback
(first available featured item). Note the card only renders for customers with **no
order history** — it is mutually exclusive with "Your usual" (`Home.tsx`:
`usualOrder ? null : findWhyNotTryItem(menu)`). The admin UI must say so.

**"Your usual" has no configuration and must not get any.** It replays
`recent[0]` — that customer's own last order.

### 4.8 Admin settings patch surface

`AdminSettingsPatchBody` is a whitelist:

```33:42:packages/types/src/admin-settings.ts
export interface AdminSettingsPatchBody {
  featuresPatch?: AdminFeaturesPatch;  // loyalty, order_ahead, review_nudge only
  kdsConfigPatch?: AdminKdsConfigPatch; // layout, display, eta, timerThresholds, audio
  hours?: CafeHours;
  themeId?: BaseThemeId;
  brand?: CafeBrandOverrides | null;
}
```

New config (pause, last-order buffer, hours overrides, featured ids, why-not-try id,
smart line grouping) must be added to this whitelist and to
`admin-settings-merge.ts` validation, or the PATCH will silently drop it.

---

## 5. `KdsConfig` mismatches to resolve

The Kitchen tab design does not match `packages/types/src/cafe.ts` in four places.
Fix the design copy rather than discovering these in the editor.

| Design shows | Reality | Action |
|---|---|---|
| `Group tickets by: Pickup time` | `KdsGroupBy = 'order_type' \| 'none'` | Relabel to `Order type` / `Don't group`, or extend the union deliberately |
| No `Columns` control | `KdsLayoutConfig.columns` exists (was in v2) | Restore — likely an accidental loss |
| `Order number` toggle | `KdsDisplayPreferences` is `showCustomerNameInHeader`, `showPickupTime`, `showOrderSource` | No backing field for order number; `showOrderSource` has no UI |
| Sounds `Soft chime` / `Double ding`; no volume | `KdsSoundId = 'chime' \| 'ping' \| 'marimba' \| 'bell' \| 'knock'`; `volume` and `overdueRepeatSeconds` exist | Use the real five; restore volume |

The dual-handle threshold slider maps cleanly onto `{ greenMax, amberMax }` and
structurally prevents the invalid ordering — keep that solution.

`Smart order line items` has no field. `groupKdsLines` is applied unconditionally
in `apps/moonshot-kds/src/board/OrderCard.tsx`; making it optional means a new
`KdsConfig` flag plus a whitelist entry (§4.8).

---

## 6. Explicitly cut — do not build

These were reviewed and removed. Do not reintroduce them.

| Cut | Why |
|-----|-----|
| "Running low" stock state | Nothing produces it; a manual third state rots within a week |
| Standalone Open/Closed toggle | Superseded by pause; three controls for one concept |
| Multiple auto-return options | One timed option only ("Out today") |
| Loyalty "which drink is free" / "redeeming a reward" dropdowns | The rule is fixed (cheapest drink-category line); dropdowns with one real option mislead |
| Separate card / pay-in-store toggles | `paymentProvider` is a single enum, auto-flipped to `stripe` by `syncAdminStripeAccountStatus`. All order-ahead payment is Stripe |
| Configurable review threshold | Hardcoded at 3; static text only |
| "N left a review" | Unmeasurable — only `opened_url` is observable |
| Reports charts, KPIs, heatmaps, trend comparisons | Placeholder only. A 7-day heatmap is n=1 per cell |
| `+ New list` on Menu | A group with no recipe pointing at it is an orphan |
| `Copy to other days` on Hours | Ambiguous — copy which day? |
| Timezone UI | UK only |
| Overview KPI row (orders, takings, average wait) | Owners won't visit them; Overview is summary + deep link |
| Shopping list / supplier reorder | Dropped. Would need suppliers, SKUs, pack sizes and an email channel; menu options are not purchasable things |
| "Your usual" configuration | Nothing to configure — it's the customer's own last order |

The `promotions` feature flag exists in `CafeFeatures` but is unimplemented. If
merchandising grows past the two home-screen slots (timed offers, bundles, happy
hour), that is its home and it should become its own tab rather than accreting onto
Order ahead.

---

## 7. Build order

1. **Presentation, zero schema change.** Eight-tab shell, read-only field system,
   Brand, Reports placeholder, Menu Items tab (Square lock is presentational),
   Connections card. Shippable on its own and de-risks the component library.
2. **Pause + last-order buffer.** Small, and they share the `cafeOpenStatus`
   signature change.
3. **Stock**, on its own side table (§4.1). Include the customer menu and KDS read
   paths, not just the admin UI.
4. **Hours overrides.**
5. **Order ahead build-out** — loyalty card with weekday pills, notes toggle,
   Home screen card (featured ordering + why-not-try id).
6. **Kitchen** once the §5 mismatches are settled.
7. **Last:** double-stamp hours, review-nudge stats.

---

## 8. Open questions

- **Who marks stock out?** v1: the owner in admin (`/stock`). A KDS-side "mark
  out" control is not designed; still deferred. The Stock tab is usable at 390px.
- **No account surface.** Café name, slug and owner email are read-only with no
  edit path anywhere in the product. `cafes.ownerFeedbackEmail` also has no UI.
- **Designs still outstanding:** the paused state (all four surfaces) and
  validation states generally. POS-locked vs editable modifier lists and the
  non-Square Menu variant are built.
