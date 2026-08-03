import { createTheme, type ThemeOptions } from '@mui/material/styles';
import {
  PAGE_CONTENT_CONSTRAINT_BREAKPOINT_PX,
  PAGE_CONTENT_MAX_WIDTH_PX,
} from './pageLayout.js';
import { surfaceCardChrome } from './surfaceCardChrome.js';

const defaultCafeLayout = {
  menuGrid: '2col' as const,
  cardStyle: 'rounded' as const,
  heroStyle: 'compact' as const,
  navStyle: 'bottom_bar' as const,
};

const pageConstraintMq = `@media (min-width:${PAGE_CONTENT_CONSTRAINT_BREAKPOINT_PX}px)`;

/**
 * Functional default MUI system (components, density, typography scale).
 * Café-specific colours/fonts are layered on via `createTheme(baseMuiTheme, cafeLayer)`.
 *
 * Component styleOverrides must use theme callbacks (not hex literals) so café palette
 * merges actually re-skin buttons, paper, chips, and toggle controls.
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
      surface: '#f8fafd',
      surfaceElevated: '#ffffff',
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
    // Default sm Container caps at 600px from the 600px breakpoint — leave tablets full-bleed.
    MuiContainer: {
      styleOverrides: {
        root: ({ theme, ownerState }) => {
          if (ownerState.disableGutters) return {};
          return {
            // Undo MUI's sm gutter bump; re-apply expanded gutters with the column.
            [theme.breakpoints.up('sm')]: {
              paddingLeft: theme.spacing(2),
              paddingRight: theme.spacing(2),
            },
            [pageConstraintMq]: {
              paddingLeft: theme.spacing(3),
              paddingRight: theme.spacing(3),
            },
          };
        },
        maxWidthSm: ({ theme }) => ({
          [theme.breakpoints.up('sm')]: {
            maxWidth: '100%',
          },
          [pageConstraintMq]: {
            maxWidth: PAGE_CONTENT_MAX_WIDTH_PX,
          },
        }),
      },
    },
    MuiButton: {
      defaultProps: { variant: 'contained', disableElevation: true },
      styleOverrides: {
        root: ({ theme }) => ({
          borderRadius: theme.shape.borderRadius * 1.2,
          fontWeight: 700,
        }),
        containedPrimary: ({ theme }) => ({
          backgroundColor: theme.palette.primary.main,
          color: theme.palette.primary.contrastText,
          '&:hover': {
            backgroundColor: theme.palette.primary.dark || theme.palette.primary.main,
          },
        }),
        outlined: ({ theme }) => ({
          borderColor: theme.palette.divider,
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => surfaceCardChrome(theme),
      },
    },
    MuiLink: {
      styleOverrides: { root: { fontWeight: 600 } },
    },
    MuiChip: {
      styleOverrides: {
        root: ({ theme }) => ({
          fontWeight: 600,
          borderColor: theme.palette.divider,
        }),
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: ({ theme }) => ({
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
};

export const baseMuiTheme = createTheme(baseMuiThemeOptions);
