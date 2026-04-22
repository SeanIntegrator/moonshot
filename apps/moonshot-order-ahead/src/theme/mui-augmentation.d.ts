import type { CafeThemeLayout } from '@moonshot/types';

/** Brand / surface colours not covered by standard MUI palette slots */
export interface CafePaletteExtension {
  surface: string;
  surfaceElevated: string;
  textMuted: string;
  textOnDark: string;
  border: string;
  heroBg: string;
  heroText: string;
}

declare module '@mui/material/styles' {
  interface Palette {
    cafe: CafePaletteExtension;
  }
  interface PaletteOptions {
    cafe?: Partial<CafePaletteExtension>;
  }

  interface Theme {
    cafeLayout: CafeThemeLayout;
  }
  interface ThemeOptions {
    cafeLayout?: CafeThemeLayout;
  }
}

export {};
