import type { CafeTheme } from '@moonshot/types';

/** Warm cream / clay / wood, serif headings, rounder edges */
export const organicTheme: CafeTheme = {
  id: 'organic',
  colors: {
    primary: '#6b4f3a',
    primaryContrast: '#faf6f1',
    secondary: '#a67c52',
    background: '#f5efe6',
    surface: '#faf6f1',
    surfaceElevated: '#ffffff',
    text: '#2c2118',
    textMuted: '#6e5a48',
    textOnDark: '#faf6f1',
    border: '#ddd0c0',
    success: '#4a7c59',
    warning: '#c47f08',
    error: '#a33b3b',
    heroBg: '#5c4033',
    heroText: '#faf6f1',
  },
  typography: {
    headingFamily: '"Fraunces", "Georgia", serif',
    bodyFamily: '"Source Sans 3", system-ui, sans-serif',
    headingWeight: 600,
    bodyWeight: 400,
    webfontUrls: [
      'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Source+Sans+3:wght@400;500;600;700&display=swap',
    ],
  },
  layout: {
    menuGrid: '2col',
    cardStyle: 'rounded',
    heroStyle: 'compact',
    navStyle: 'bottom_bar',
  },
};
