import type { CafeTheme } from '@moonshot/types';

/** Clean, modern, Scandi-influenced */
export const minimalTheme: CafeTheme = {
  id: 'minimal',
  colors: {
    primary: '#111827',
    primaryContrast: '#ffffff',
    secondary: '#6b7280',
    background: '#fafafa',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    text: '#111827',
    textMuted: '#6b7280',
    textOnDark: '#f9fafb',
    border: '#e5e7eb',
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    heroBg: '#111827',
    heroText: '#f9fafb',
  },
  typography: {
    headingFamily: '"Inter", system-ui, sans-serif',
    bodyFamily: '"Inter", system-ui, sans-serif',
    headingWeight: 600,
    bodyWeight: 400,
  },
  layout: {
    menuGrid: '3col',
    cardStyle: 'sharp',
    heroStyle: 'compact',
    navStyle: 'top_bar',
  },
};
