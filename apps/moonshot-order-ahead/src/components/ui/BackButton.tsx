import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton, { type IconButtonProps } from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import type { ComponentType } from 'react';

/**
 * Contained circular back control — filled neutral surface, no outline border.
 * Item detail hero overlays may override bgcolor via sx for contrast on images.
 */
export const BackButton: ComponentType<IconButtonProps> = styled(IconButton)(({ theme }) => ({
  backgroundColor: theme.palette.action.hover,
  borderRadius: '50%',
  color: theme.palette.text.primary,
  WebkitTapHighlightColor: 'transparent',
  '&:hover': {
    backgroundColor: theme.palette.action.selected,
  },
})) as typeof IconButton;

export function BackButtonIcon() {
  return <ArrowBackIcon fontSize="small" />;
}
