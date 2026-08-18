import type { ConsoleTokens } from './console-tokens.js';

declare module '@mui/material/styles' {
  interface Theme {
    console: ConsoleTokens;
  }
  interface ThemeOptions {
    console?: ConsoleTokens;
  }
}
