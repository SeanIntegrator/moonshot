import Box, { type BoxProps } from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import type { ComponentType } from 'react';

export type StepCircleProps = BoxProps & { emphasized?: boolean };

/** Order-status step indicator circle — colours from theme.palette.primary. */
export const StepCircle: ComponentType<StepCircleProps> = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'emphasized',
})<{ emphasized?: boolean }>(({ theme, emphasized }) => ({
  width: 28,
  height: 28,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: emphasized ? theme.palette.primary.main : theme.palette.background.paper,
  border: emphasized ? 'none' : `1px solid ${theme.palette.divider}`,
  color: emphasized ? theme.palette.primary.contrastText : theme.palette.text.secondary,
  fontSize: 12,
  fontWeight: 700,
}));
