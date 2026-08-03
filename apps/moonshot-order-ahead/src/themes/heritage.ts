import type { CafeTheme } from '@moonshot/types';

/** White + blue default aligned with current mobile design direction. */
export const heritageTheme: CafeTheme = {
  id: 'heritage',
  colors: {
    primary: '#0d1b3d',
    primaryContrast: '#ffffff',
    secondary: '#334e85',
    background: '#f4f7fc',
    surface: '#f8fafd',
    surfaceElevated: '#ffffff',
    text: '#111a30',
    textMuted: '#5d6780',
    textOnDark: '#f4f7ff',
    border: '#dbe3f1',
    success: '#0f8c62',
    warning: '#b97816',
    error: '#dc2626',
    heroBg: '#0d1b3d',
    heroText: '#f4f7ff',
  },
  typography: {
    headingFamily: '"Inter", system-ui, sans-serif',
    bodyFamily: '"Inter", system-ui, sans-serif',
    headingWeight: 600,
    bodyWeight: 400,
  },
  layout: {
    menuGrid: '2col',
    cardStyle: 'rounded',
    heroStyle: 'full',
    navStyle: 'bottom_bar',
  },
};
