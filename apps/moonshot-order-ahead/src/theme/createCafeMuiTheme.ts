import { createTheme } from '@mui/material/styles';
import type { CafeTheme } from '@moonshot/types';
import { resolveCafeTheme } from '../themes/index.js';
import { cafeTokensToMuiOptions } from './cafeTokensToMuiOptions.js';
import { structuralMuiTheme } from './muiBaseTheme.js';

/**
 * Structural shell + café token layer.
 * `null` falls back to the minimal pack so palette/fonts always come from a theme pack
 * (never an inline duplicate in the structural base).
 */
export function createCafeMuiTheme(tokens: CafeTheme | null) {
  const resolved = tokens ?? resolveCafeTheme('minimal');
  return createTheme(structuralMuiTheme, cafeTokensToMuiOptions(resolved));
}
