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
    primary: { main: '#0d1b3d', contrastText: '#ffffff' },
    secondary: { main: '#334e85', contrastText: '#ffffff' },
    background: { default: '#f4f7fc', paper: '#ffffff' },
    text: { primary: '#111a30', secondary: '#5d6780' },
    divider: '#dbe3f1',
    success: { main: '#0f8c62' },
    warning: { main: '#b97816' },
    error: { main: '#dc2626' },
    cafe: {
      surface: '#ffffff',
      surfaceElevated: '#f8fafe',
      textMuted: '#5d6780',
      textOnDark: '#f4f7ff',
      border: '#dbe3f1',
      heroBg: '#0d1b3d',
      heroText: '#f4f7ff',
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
      styleOverrides: {
        root: { borderRadius: 12, fontWeight: 700 },
        containedPrimary: {
          backgroundColor: '#0d1b3d',
          '&:hover': { backgroundColor: '#16295a' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid #dbe3f1',
        },
      },
    },
    MuiLink: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
  },
};

export const baseMuiTheme = createTheme(baseMuiThemeOptions);
