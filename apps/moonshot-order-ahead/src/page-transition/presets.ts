/**
 * Page transitions: swap ACTIVE_PAGE_TRANSITION to change the effect.
 * Fade is the default; slide / stack presets are ready when we want them.
 *
 * Flow: route change → exit animation on current tree → swap location → enter animation.
 */
export type PageTransitionKind = 'fade' | 'slide' | 'stack';

export type PageTransitionPreset = {
  exitClass: string;
  enterClass: string;
  /** Must match CSS animation duration */
  durationMs: number;
};

export const PAGE_TRANSITION_PRESETS: Record<PageTransitionKind, PageTransitionPreset> = {
  fade: {
    exitClass: 'page-transition--fade-exit',
    enterClass: 'page-transition--fade-enter',
    durationMs: 160,
  },
  slide: {
    exitClass: 'page-transition--slide-exit',
    enterClass: 'page-transition--slide-enter',
    durationMs: 220,
  },
  stack: {
    exitClass: 'page-transition--stack-exit',
    enterClass: 'page-transition--stack-enter',
    durationMs: 220,
  },
};

/** Single switch for the active page transition style. */
export const ACTIVE_PAGE_TRANSITION: PageTransitionKind = 'fade';
