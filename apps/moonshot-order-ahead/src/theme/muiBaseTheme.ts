import { createTheme, type ThemeOptions } from '@mui/material/styles';
import {
  PAGE_CONTENT_CONSTRAINT_BREAKPOINT_PX,
  PAGE_CONTENT_MAX_WIDTH_PX,
} from './pageLayout.js';
import { radiiFromCardStyle } from './radii.js';
import { surfaceCardChrome } from './surfaceCardChrome.js';

const defaultCafeLayout = {
  menuGrid: '2col' as const,
  cardStyle: 'rounded' as const,
  heroStyle: 'compact' as const,
  navStyle: 'bottom_bar' as const,
};

const defaultRadii = radiiFromCardStyle(defaultCafeLayout.cardStyle);

const pageConstraintMq = `@media (min-width:${PAGE_CONTENT_CONSTRAINT_BREAKPOINT_PX}px)`;

/**
 * Structural MUI defaults only — density, type *scale*, component chrome.
 * Palette and font *families* come exclusively from café theme packs via
 * `createCafeMuiTheme` → `cafeTokensToMuiOptions`. No brand hex here.
 *
 * Component styleOverrides must use theme callbacks so café merges re-skin UI.
 */
export const structuralThemeOptions: ThemeOptions = {
  shape: { borderRadius: defaultRadii.card },
  radii: defaultRadii,
  cafeLayout: defaultCafeLayout,
  typography: {
    // Families overwritten by café pack; sizes/line-heights stay structural.
    h1: { fontSize: '1.75rem', lineHeight: 1.2 },
    h2: { fontSize: '1.35rem', lineHeight: 1.25 },
    h3: { fontSize: '1.15rem', lineHeight: 1.3 },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.875rem', lineHeight: 1.5 },
    button: { textTransform: 'none', fontWeight: 600 },
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
          borderRadius: theme.radii.control,
          fontWeight: 700,
          variants: [
            {
              props: { variant: 'contained', color: 'primary' },
              style: {
                backgroundColor: theme.palette.primary.main,
                color: theme.palette.primary.contrastText,
                '&:hover': {
                  backgroundColor: theme.palette.primary.dark || theme.palette.primary.main,
                },
              },
            },
          ],
        }),
        outlined: ({ theme }) => ({
          borderColor: theme.palette.divider,
          color: theme.palette.text.primary,
        }),
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: ({ theme }) => ({
          ...surfaceCardChrome(theme),
          borderRadius: theme.radii.card,
        }),
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
          borderRadius: theme.radii.control,
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
        root: ({ theme }) => ({
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: theme.radii.control,
        }),
      },
    },
  },
};

/**
 * Structural shell only — missing palette.cafe until a café pack is merged.
 * Prefer `createCafeMuiTheme(null)` (minimal fallback) for renderable themes.
 */
export const structuralMuiTheme = createTheme(structuralThemeOptions);

/** @deprecated Use `structuralMuiTheme` or `createCafeMuiTheme(null)`. */
export const baseMuiTheme = structuralMuiTheme;
export const baseMuiThemeOptions = structuralThemeOptions;
