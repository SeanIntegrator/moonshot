import { createTheme, type ThemeOptions } from '@mui/material/styles';

/** Brand palette shared by signup/onboarding surfaces. */
export const brandPalette = {
  lime: '#e8ff47',
  limeHover: '#d4eb3a',
  bg: '#0a0a0b',
  paper: '#141416',
  border: '#2a2a2e',
  muted: '#71717a',
  text: '#f4f4f5',
  ink: '#0a0a0b',
} as const;

const numberInputReset: ThemeOptions['components'] = {
  MuiCssBaseline: {
    styleOverrides: {
      'input[type=number]': {
        MozAppearance: 'textfield',
      },
      'input[type=number]::-webkit-outer-spin-button': {
        WebkitAppearance: 'none',
        margin: 0,
      },
      'input[type=number]::-webkit-inner-spin-button': {
        WebkitAppearance: 'none',
        margin: 0,
      },
    },
  },
};

/** Dark editorial theme for login, signup, and onboarding. */
export const signupTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: brandPalette.lime,
      contrastText: brandPalette.ink,
    },
    background: {
      default: brandPalette.bg,
      paper: brandPalette.paper,
    },
    divider: brandPalette.border,
    text: {
      primary: brandPalette.text,
      secondary: brandPalette.muted,
    },
    error: { main: '#ff4d4d' },
    success: { main: '#2d6a4f' },
    warning: { main: '#d4a017' },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
    h1: { fontFamily: '"Syne", sans-serif', fontWeight: 800 },
    h2: { fontFamily: '"Syne", sans-serif', fontWeight: 800 },
    h3: { fontFamily: '"Syne", sans-serif', fontWeight: 800 },
    h4: { fontFamily: '"Syne", sans-serif', fontWeight: 800 },
    h5: { fontFamily: '"Syne", sans-serif', fontWeight: 800 },
    h6: { fontFamily: '"Syne", sans-serif', fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 700 },
  },
  components: {
    ...numberInputReset,
    MuiButton: {
      styleOverrides: {
        root: {
          variants: [
            {
              props: { variant: 'contained', color: 'primary' },
              style: {
                backgroundColor: brandPalette.lime,
                color: brandPalette.ink,
                fontWeight: 700,
                '&:hover': { backgroundColor: brandPalette.limeHover },
                '&.Mui-disabled': {
                  backgroundColor: brandPalette.border,
                  color: brandPalette.muted,
                },
              },
            },
          ],
        },
        outlined: {
          borderColor: brandPalette.border,
          color: brandPalette.text,
          '&:hover': { borderColor: brandPalette.muted, backgroundColor: 'rgba(255,255,255,0.04)' },
        },
        text: {
          color: brandPalette.muted,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-notchedOutline': { borderColor: brandPalette.border },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: brandPalette.muted },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: brandPalette.lime },
        },
        input: { color: brandPalette.text },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: brandPalette.muted,
          '&.Mui-focused': { color: brandPalette.lime },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: { color: brandPalette.muted },
      },
    },
    MuiStepLabel: {
      styleOverrides: {
        label: {
          color: brandPalette.muted,
          '&.Mui-active': { color: brandPalette.lime },
          '&.Mui-completed': { color: brandPalette.text },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          color: brandPalette.border,
          '&.Mui-active': { color: brandPalette.lime },
          '&.Mui-completed': { color: '#3b82f6' },
        },
        text: { fill: brandPalette.ink },
      },
    },
    MuiLink: {
      styleOverrides: {
        root: { color: brandPalette.lime },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: brandPalette.paper,
          border: `1px solid ${brandPalette.border}`,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});

/** Light theme for the post-onboarding dashboard. */
export const dashboardTheme = createTheme({
  palette: { mode: 'light', primary: { main: '#0f172a' } },
  components: numberInputReset,
});
