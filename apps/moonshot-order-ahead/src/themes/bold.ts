import type { CafeTheme } from '@moonshot/types';

/** High-contrast, punchy, urban */
export const boldTheme: CafeTheme = {
  id: 'bold',
  colors: {
    primary: '#000000',
    primaryContrast: '#ffdd00',
    secondary: '#ffdd00',
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceElevated: '#ffffff',
    text: '#000000',
    textMuted: '#404040',
    textOnDark: '#ffffff',
    border: '#000000',
    success: '#00a651',
    warning: '#ff8c00',
    error: '#e10600',
    heroBg: '#000000',
    heroText: '#ffffff',
  },
  typography: {
    headingFamily: '"Archivo Black", system-ui, sans-serif',
    bodyFamily: '"Work Sans", system-ui, sans-serif',
    headingWeight: 700,
    bodyWeight: 500,
  },
  layout: {
    menuGrid: '2col',
    cardStyle: 'sharp',
    heroStyle: 'full',
    navStyle: 'bottom_bar',
  },
};
