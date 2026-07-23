import Box, { type BoxProps } from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import type { ComponentType } from 'react';

export type QtyBadgeProps = BoxProps & { visible?: boolean };

/** Quantity badge overlay for menu item cards — colours from theme.palette.primary. */
export const QtyBadge: ComponentType<QtyBadgeProps> = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'visible',
})<{ visible?: boolean }>(({ theme, visible }) => ({
  position: 'absolute',
  bottom: 52,
  right: 8,
  width: 32,
  height: 32,
  borderRadius: '50%',
  backgroundColor: visible ? theme.palette.primary.main : 'transparent',
  color: theme.palette.primary.contrastText,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 13,
  fontWeight: 700,
  opacity: visible ? 1 : 0,
  transform: visible ? 'scale(1)' : 'scale(0.6)',
  transition: 'opacity 180ms ease, transform 180ms ease, background-color 180ms ease',
  pointerEvents: 'none',
  zIndex: 1,
}));
