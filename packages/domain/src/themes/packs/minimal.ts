import type { CafeTheme } from '@moonshot/types';

/** White / near-black, clinical, sharp edges */
export const minimalTheme: CafeTheme = {
  id: 'minimal',
  colors: {
    primary: '#111827',
    primaryContrast: '#ffffff',
    secondary: '#6b7280',
    background: '#fafafa',
    surface: '#fcfcfc',
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
    webfontUrls: [
      'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    ],
  },
  layout: {
    menuGrid: '2col',
    cardStyle: 'sharp',
    heroStyle: 'compact',
    navStyle: 'bottom_bar',
  },
};
