import ButtonBase from '@mui/material/ButtonBase';
import type { Theme } from '@mui/material/styles';
import { styled } from '@mui/material/styles';

/** Field-style pickup time trigger — theme borders/surfaces. */
export const PickupTimeFieldButton = styled(ButtonBase)(({ theme }) => ({
  width: '100%',
  textAlign: 'left',
  padding: theme.spacing(1.5),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.radii.control,
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  minHeight: 72,
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: 'inherit',
  WebkitTapHighlightColor: 'transparent',
  '&:focus-visible': {
    outline: `2px solid ${theme.palette.primary.main}`,
    outlineOffset: 2,
  },
})) as typeof ButtonBase;

/** Compact chip-style pickup control with primary-tinted fill. */
export function pickupChipSx(theme: Theme) {
  return {
    height: 'auto' as const,
    py: 0.625,
    border: 'none',
    bgcolor: theme.alpha(theme.palette.primary.main, 0.08),
    '&:hover': { bgcolor: theme.alpha(theme.palette.primary.main, 0.12) },
    '& .MuiChip-label': { px: 0.5 },
    '& .MuiChip-icon': { ml: 1, mr: 0.75, color: theme.palette.text.secondary },
  };
}
