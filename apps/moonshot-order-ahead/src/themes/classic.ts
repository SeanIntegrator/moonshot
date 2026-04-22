import type { CafeTheme } from '@moonshot/types';

/** Timeless coffee-house warm neutrals */
export const classicTheme: CafeTheme = {
  id: 'classic',
  colors: {
    primary: '#3c2f2f',
    primaryContrast: '#faf7f2',
    secondary: '#b08968',
    background: '#f7f3eb',
    surface: '#fdfcfa',
    surfaceElevated: '#ffffff',
    text: '#2a2420',
    textMuted: '#6f655c',
    textOnDark: '#faf7f2',
    border: '#e0d6c8',
    success: '#4a6741',
    warning: '#c08457',
    error: '#8f3a3a',
    heroBg: '#3c2f2f',
    heroText: '#faf7f2',
  },
  typography: {
    headingFamily: '"Libre Baskerville", "Georgia", serif',
    bodyFamily: '"Lato", system-ui, sans-serif',
    headingWeight: 600,
    bodyWeight: 400,
  },
  layout: {
    menuGrid: '2col',
    cardStyle: 'pill',
    heroStyle: 'compact',
    navStyle: 'bottom_bar',
  },
};
