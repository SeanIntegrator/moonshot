/**
 * Phone-column shell: full-bleed through tablet, constrained from desktop up.
 * MUI `Container maxWidth="sm"` defaults to constraining at 600px — too early for tablets.
 */
export const PAGE_CONTENT_MAX_WIDTH_PX = 600;

/** Viewport width at which max-width + expanded Container gutters apply. */
export const PAGE_CONTENT_CONSTRAINT_BREAKPOINT_PX = 1024;

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
