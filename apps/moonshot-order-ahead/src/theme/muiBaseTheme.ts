import { createTheme, type ThemeOptions } from '@mui/material/styles';

const defaultCafeLayout = {
  menuGrid: '2col' as const,
  cardStyle: 'rounded' as const,
  heroStyle: 'compact' as const,
  navStyle: 'bottom_bar' as const,
};

/**
 * Functional default MUI system (components, density, typography scale).
 * Café-specific colours/fonts are layered on via `createTheme(baseMuiTheme, cafeLayer)`.
 */
export const baseMuiThemeOptions: ThemeOptions = {
  shape: { borderRadius: 10 },
  cafeLayout: defaultCafeLayout,
  typography: {
    fontFamily: '"Inter", system-ui, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 600, lineHeight: 1.2 },
    h2: { fontSize: '1.35rem', fontWeight: 600, lineHeight: 1.25 },
    h3: { fontSize: '1.15rem', fontWeight: 600, lineHeight: 1.3 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  palette: {
    mode: 'light',
    primary: { main: '#1976d2', contrastText: '#ffffff' },
    secondary: { main: '#9c27b0', contrastText: '#ffffff' },
    background: { default: '#fafafa', paper: '#ffffff' },
    text: { primary: '#111827', secondary: '#6b7280' },
    divider: '#e5e7eb',
    success: { main: '#059669' },
    warning: { main: '#d97706' },
    error: { main: '#dc2626' },
    cafe: {
      surface: '#ffffff',
      surfaceElevated: '#ffffff',
      textMuted: '#6b7280',
      textOnDark: '#f9fafb',
      border: '#e5e7eb',
      heroBg: '#111827',
      heroText: '#f9fafb',
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: { lineHeight: 1.5 },
      },
    },
    MuiButton: {
      defaultProps: { variant: 'contained', disableElevation: true },
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiPaper: {
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiLink: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
};

export const baseMuiTheme = createTheme(baseMuiThemeOptions);
