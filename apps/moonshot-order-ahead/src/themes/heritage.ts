import type { CafeTheme } from '@moonshot/types';

/** Warm, traditional — bakery-forward */
export const heritageTheme: CafeTheme = {
  id: 'heritage',
  colors: {
    primary: '#1a2e1a',
    primaryContrast: '#f5f0e6',
    secondary: '#c8902a',
    background: '#f0e6d0',
    surface: '#faf6ee',
    surfaceElevated: '#ffffff',
    text: '#1c1c1c',
    textMuted: '#5c5346',
    textOnDark: '#f5f0e6',
    border: '#d4c4a8',
    success: '#2d6a4f',
    warning: '#d4a017',
    error: '#9b2226',
    heroBg: '#1a2e1a',
    heroText: '#f5f0e6',
  },
  typography: {
    headingFamily: '"Fraunces", "Georgia", serif',
    bodyFamily: '"Plus Jakarta Sans", system-ui, sans-serif',
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
