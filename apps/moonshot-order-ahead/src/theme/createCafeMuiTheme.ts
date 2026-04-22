import { createTheme } from '@mui/material/styles';
import type { CafeTheme } from '@moonshot/types';
import { cafeTokensToMuiOptions } from './cafeTokensToMuiOptions.js';
import { baseMuiTheme } from './muiBaseTheme.js';

/** Base functional theme + café token layer (hotswappable when `tokens` changes). */
export function createCafeMuiTheme(tokens: CafeTheme | null) {
  if (!tokens) return baseMuiTheme;
  return createTheme(baseMuiTheme, cafeTokensToMuiOptions(tokens));
}
