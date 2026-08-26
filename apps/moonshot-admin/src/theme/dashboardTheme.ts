import { createTheme } from '@mui/material/styles';
import { consoleTokens } from './console-tokens.js';

const ink = consoleTokens.ink;
const muted = consoleTokens.muted;
const border = consoleTokens.card.border;
const font = '"IBM Plex Sans", system-ui, sans-serif';

/**
 * Light v3 console theme. Login / signup / onboarding keep `signupTheme`.
 */
export const dashboardTheme = createTheme({
  console: consoleTokens,
  palette: {
    mode: 'light',
    primary: { main: ink, contrastText: '#ffffff' },
    secondary: { main: muted },
    background: {
      default: consoleTokens.pageFill,
      paper: consoleTokens.card.bg,
    },
    text: {
      primary: ink,
      secondary: muted,
    },
    divider: border,
    success: { main: consoleTokens.status.takingOrders },
    warning: { main: consoleTokens.stock.outToday },
    error: { main: consoleTokens.stock.out },
    info: { main: consoleTokens.connection.stale },
  },
  shape: { borderRadius: 8 },
  typography: {
    fontFamily: font,
    fontWeightBold: 700,
    h1: { fontFamily: font, fontWeight: 700, fontSize: '1.75rem', letterSpacing: '-0.02em' },
    h2: { fontFamily: font, fontWeight: 700, fontSize: '1.375rem', letterSpacing: '-0.02em' },
    h3: { fontFamily: font, fontWeight: 700, fontSize: '1.125rem' },
    h4: { fontFamily: font, fontWeight: 700, fontSize: '1rem' },
    h5: { fontFamily: font, fontWeight: 600, fontSize: '0.9375rem' },
    h6: { fontFamily: font, fontWeight: 600, fontSize: '0.875rem' },
    button: { textTransform: 'none', fontWeight: 600, fontFamily: font },
    body1: { fontSize: '0.9375rem' },
    body2: { fontSize: '0.8125rem', color: muted },
    caption: { fontSize: '0.75rem', color: muted },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        'input[type=number]': { MozAppearance: 'textfield' },
        'input[type=number]::-webkit-outer-spin-button': { WebkitAppearance: 'none', margin: 0 },
        'input[type=number]::-webkit-inner-spin-button': { WebkitAppearance: 'none', margin: 0 },
      },
    },
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
        contained: {
          '&.Mui-disabled': {
            backgroundColor: '#E5E7EB',
            color: '#9CA3AF',
          },
        },
        outlined: {
          borderColor: border,
          color: ink,
          '&:hover': { borderColor: muted, backgroundColor: 'rgba(17, 24, 39, 0.04)' },
        },
        text: { color: muted },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': {
            color: '#fff',
            '& + .MuiSwitch-track': {
              backgroundColor: ink,
              opacity: 1,
            },
          },
        },
        track: {
          borderRadius: 12,
          backgroundColor: '#D1D5DB',
          opacity: 1,
        },
        thumb: { backgroundColor: '#fff' },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          '& .MuiOutlinedInput-notchedOutline': { borderColor: border },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: muted },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: ink, borderWidth: 1 },
          '&.Mui-error .MuiOutlinedInput-notchedOutline': {
            borderColor: consoleTokens.stock.out,
            borderWidth: 1,
          },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: {
          fontSize: 12,
          marginLeft: 0,
          '&.Mui-error': { color: consoleTokens.stock.out },
        },
      },
    },
    MuiTabs: {
      styleOverrides: {
        // 1px grey baseline under all tabs; selected indicator (2px ink) sits on the same line
        root: { borderBottom: `1px solid ${border}` },
        indicator: { height: 2, backgroundColor: ink },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
          color: muted,
          minHeight: 44,
          paddingInline: 12,
          '&.Mui-selected': { color: ink, fontWeight: 600 },
        },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: {
          color: ink,
          fontWeight: 600,
          textUnderlineOffset: 3,
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { fontSize: 12, backgroundColor: ink },
      },
    },
  },
});
