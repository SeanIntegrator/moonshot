export const CONSOLE_TABS = [
  { to: '/overview', label: 'Overview' },
  { to: '/stock', label: 'Stock' },
  { to: '/menu', label: 'Menu' },
  { to: '/hours', label: 'Hours' },
  { to: '/order-ahead', label: 'Order ahead' },
  { to: '/kitchen', label: 'Kitchen' },
  { to: '/brand', label: 'Brand' },
  { to: '/reports', label: 'Reports' },
] as const;

export type ConsolePath = (typeof CONSOLE_TABS)[number]['to'];
