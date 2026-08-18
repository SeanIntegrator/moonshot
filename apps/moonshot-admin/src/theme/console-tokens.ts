/**
 * v3 signed-in console tokens. Attached to `dashboardTheme` as `theme.console`
 * so primitives inherit one palette instead of restyling locally.
 *
 * Amber / red are reserved for stock (and Stripe/Square status dots). Pause and
 * connection stale reuse the same amber dot as the state sheets — not a second
 * semantic colour.
 */
export const consoleTokens = {
  pageFill: '#F4F5F6',
  ink: '#111827',
  muted: '#6B7280',
  card: {
    bg: '#FFFFFF',
    border: '#E6E8EB',
    radiusPx: 12,
  },
  readonly: {
    fill: '#F5F6F7',
    border: '#E6E8EB',
  },
  hero: '#1B2432',
  hairline: 'rgba(17, 24, 39, 0.08)',
  stock: {
    inFill: '#F0F1F2',
    outToday: '#D97706',
    out: '#DC2626',
    outTodayRow: 'rgba(217, 119, 6, 0.10)',
    outRow: 'rgba(220, 38, 38, 0.08)',
    outTodayMeta: '#B45309',
    outMeta: '#B91C1C',
    unselected: '#6B7280',
    avatarFill: '#E5E7EB',
    selectedRow: '#F3F4F6',
  },
  status: {
    takingOrders: '#16A34A',
    paused: '#D97706',
    closed: '#9CA3AF',
  },
  connection: {
    healthy: '#16A34A',
    stale: '#EA580C',
    failed: '#DC2626',
  },
} as const;

export type ConsoleTokens = typeof consoleTokens;
