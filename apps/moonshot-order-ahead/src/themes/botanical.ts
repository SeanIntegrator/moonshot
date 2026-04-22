import type { CafeTheme } from '@moonshot/types';

/** Earthy, organic, plant-forward */
export const botanicalTheme: CafeTheme = {
  id: 'botanical',
  colors: {
    primary: '#2f4f3c',
    primaryContrast: '#f4f7f4',
    secondary: '#8b7355',
    background: '#eef3ec',
    surface: '#f8faf7',
    surfaceElevated: '#ffffff',
    text: '#1a231c',
    textMuted: '#4d5c52',
    textOnDark: '#f4f7f4',
    border: '#c5d1c3',
    success: '#3d6b52',
    warning: '#c47f08',
    error: '#a33b3b',
    heroBg: '#2f4f3c',
    heroText: '#f4f7f4',
  },
  typography: {
    headingFamily: '"DM Serif Display", "Georgia", serif',
    bodyFamily: '"Source Sans 3", system-ui, sans-serif',
    headingWeight: 600,
    bodyWeight: 400,
  },
  layout: {
    menuGrid: '2col',
    cardStyle: 'rounded',
    heroStyle: 'compact',
    navStyle: 'bottom_bar',
  },
};
