import ButtonBase, { type ButtonBaseProps } from '@mui/material/ButtonBase';
import Box, { type BoxProps } from '@mui/material/Box';
import { styled, type Theme } from '@mui/material/styles';
import type { ComponentType } from 'react';

/** Shared selected/idle border for size tiles and modifier chips. */
export function optionBorderColor(theme: Theme, selected?: boolean): string {
  return selected ? theme.alpha(theme.palette.text.primary, 0.3) : theme.palette.divider;
}

export type OptionTileProps = ButtonBaseProps & { selected?: boolean };

/**
 * Theme-aware selection tile for sizes / single-select modifiers.
 * Selected and idle surfaces come from the café palette so theme merges re-skin pickers.
 */
export const OptionTile: ComponentType<OptionTileProps> = styled(ButtonBase, {
  shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected?: boolean }>(({ theme, selected }) => ({
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: theme.spacing(1.25),
  borderRadius: theme.radii.control,
  border: `1px solid ${optionBorderColor(theme, selected)}`,
  backgroundColor: selected ? theme.palette.action.selected : theme.palette.background.paper,
  color: theme.palette.text.primary,
  fontFamily: 'inherit',
  WebkitTapHighlightColor: 'transparent',
  transition: 'background-color 180ms ease, border-color 180ms ease',
  '&:active': {
    backgroundColor: selected ? theme.palette.action.selected : theme.palette.background.paper,
  },
}));

/** Colour swatch for size/modifier options (hex comes from menu data, not brand theme). */
export const OptionColorDot: ComponentType<BoxProps> = styled(Box)(({ theme }) => ({
  width: 10,
  height: 10,
  borderRadius: '50%',
  border: `0.5px solid ${theme.palette.divider}`,
  flexShrink: 0,
  display: 'inline-block',
})) as typeof Box;
