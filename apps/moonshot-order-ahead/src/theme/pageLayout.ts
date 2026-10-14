/**
 * Phone-column shell: full-bleed through tablet, constrained from desktop up.
 * MUI `Container maxWidth="sm"` defaults to constraining at 600px — too early for tablets.
 */
export const PAGE_CONTENT_MAX_WIDTH_PX = 600;

/** Viewport width at which max-width + expanded Container gutters apply. */
export const PAGE_CONTENT_CONSTRAINT_BREAKPOINT_PX = 1024;

/**
 * How far to darken `background.default` for the desktop letterbox outside the
 * phone column. Tablet/phone stay full-bleed and are not letterboxed.
 */
export const PAGE_LETTERBOX_DARKEN = 0.08;

/** Fixed bottom thumb / top nav chrome height. */
export const BOTTOM_NAV_HEIGHT_PX = 56;

/** Approximate height of the floating go-to-basket strip above the nav. */
export const FLOATING_CART_BAR_HEIGHT_PX = 48;

const TOAST_GAP_PX = 16;
const TOAST_CART_EXTRA_GAP_PX = 20;

/** Fixed chrome height plus the home indicator in a fullscreen install. */
function withSafeAreaBottom(px: number): string {
  return `calc(${px}px + env(safe-area-inset-bottom, 0px))`;
}

/** Clears the fixed nav, and the home indicator when launched fullscreen. */
export function navClearance(): string {
  return withSafeAreaBottom(BOTTOM_NAV_HEIGHT_PX);
}

/** Snackbar `bottom` so toasts clear the nav (+ optional cart bar). */
export function toastBottomPx(cartBarVisible: boolean): string {
  const px = cartBarVisible
    ? BOTTOM_NAV_HEIGHT_PX + FLOATING_CART_BAR_HEIGHT_PX + TOAST_CART_EXTRA_GAP_PX
    : BOTTOM_NAV_HEIGHT_PX + TOAST_GAP_PX;
  return withSafeAreaBottom(px);
}

/**
 * Item-detail add-to-cart dock before the home-indicator inset.
 * Matches FixedBottomBar with its controls; the bar adds the inset itself.
 */
const ITEM_DETAIL_DOCK_PX = 84;

/** Scroll inset so the last modifiers clear the add-to-cart dock. */
export function itemDetailDockClearance(): string {
  return withSafeAreaBottom(ITEM_DETAIL_DOCK_PX);
}

/**
 * Menu list inset before the home indicator. MUI `pb: 14` (112px) cleared the
 * 56px nav plus the floating cart strip; the strip now sits above a taller nav.
 */
const MENU_LIST_BOTTOM_PX = 112;

/** Scroll inset so the last menu cards clear the nav and cart strip. */
export function menuBottomClearance(): string {
  return withSafeAreaBottom(MENU_LIST_BOTTOM_PX);
}

/**
 * Routes that hide the bottom nav (checkout, restore, order confirmed).
 * Body padding already consumes the top safe area inside a border-box `height: 100%`,
 * so a raw `100dvh` column overflows the screen. Bottom padding keeps the last
 * action above the home indicator — there is no docked bar to do it.
 */
export const chromelessPageSx = {
  minHeight: 'calc(100dvh - env(safe-area-inset-top, 0px))',
  pb: 'env(safe-area-inset-bottom, 0px)',
  boxSizing: 'border-box',
} as const;

const constraintMq = `@media (min-width:${PAGE_CONTENT_CONSTRAINT_BREAKPOINT_PX}px)`;

/** Fixed chrome (nav, cart bar, snackbars) — matches page column width. */
export const pageContentWidthSx = {
  width: '100%',
  maxWidth: '100%',
  mx: 'auto',
  [constraintMq]: {
    maxWidth: PAGE_CONTENT_MAX_WIDTH_PX,
  },
} as const;

/**
 * Viewport-tall app column. On desktop it paints the café canvas so the
 * page letterbox (CssBaseline) can sit outside without changing in-app colour.
 */
export const pageColumnShellSx = {
  minHeight: '100%',
  width: '100%',
  [constraintMq]: {
    maxWidth: PAGE_CONTENT_MAX_WIDTH_PX,
    mx: 'auto',
    bgcolor: 'background.default',
  },
} as const;
