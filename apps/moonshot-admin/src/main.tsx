import { CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';

const theme = createTheme({
  palette: { mode: 'light', primary: { main: '#0f172a' } },
  components: {
    // Number inputs keep numeric keyboards/validation but lose the native +/- spinner UI.
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
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
