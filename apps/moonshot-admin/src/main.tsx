import { CssBaseline, ThemeProvider } from '@mui/material';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { dashboardTheme } from './theme/adminTheme.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={dashboardTheme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);
