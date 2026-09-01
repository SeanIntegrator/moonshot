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

/** Snackbar `bottom` so toasts clear the nav (+ optional cart bar). */
export function toastBottomPx(cartBarVisible: boolean): number {
  if (!cartBarVisible) return BOTTOM_NAV_HEIGHT_PX + TOAST_GAP_PX;
  // Extra gap so the toast clears the floating go-to-basket strip.
  return BOTTOM_NAV_HEIGHT_PX + FLOATING_CART_BAR_HEIGHT_PX + TOAST_CART_EXTRA_GAP_PX;
}

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
