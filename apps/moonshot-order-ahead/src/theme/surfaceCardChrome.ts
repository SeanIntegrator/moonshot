import { type Theme } from '@mui/material/styles';

/**
 * Shared elevated-card chrome used by MuiPaper and SurfaceCard.
 * Soft fill + divider border + very subtle shadow — no brand hex.
 */
export function surfaceCardChrome(theme: Theme) {
  return {
    backgroundColor: theme.palette.background.paper,
    backgroundImage: 'none' as const,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: `0 1px 2px ${theme.alpha(theme.palette.common.black, 0.04)}, 0 1px 3px ${theme.alpha(theme.palette.common.black, 0.05)}`,
  };
}
