import type { CafeTheme } from '@moonshot/types';

/** Brighter canvas, higher contrast, bubble headings, rounder controls */
export const livelyTheme: CafeTheme = {
  id: 'lively',
  colors: {
    primary: '#e11d48',
    primaryContrast: '#ffffff',
    secondary: '#f59e0b',
    background: '#fff7ed',
    surface: '#fffbeb',
    surfaceElevated: '#ffffff',
    text: '#1c1917',
    textMuted: '#78716c',
    textOnDark: '#ffffff',
    border: '#fed7aa',
    success: '#16a34a',
    warning: '#ea580c',
    error: '#dc2626',
    heroBg: '#e11d48',
    heroText: '#ffffff',
  },
  typography: {
    headingFamily: '"Fredoka", system-ui, sans-serif',
    bodyFamily: '"Outfit", system-ui, sans-serif',
    headingWeight: 600,
    bodyWeight: 400,
    webfontUrls: [
      'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Outfit:wght@400;500;600;700&display=swap',
    ],
  },
  layout: {
    menuGrid: '2col',
    cardStyle: 'pill',
    heroStyle: 'full',
    navStyle: 'bottom_bar',
  },
};
