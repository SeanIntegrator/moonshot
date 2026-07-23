import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';

/**
 * Card/link surface with theme-aware chrome and tap scale feedback.
 * Replaces the former `.pressable-card` CSS class so radius/borders follow the café theme.
 */
export const PressableCard = styled(Box)(({ theme }) => ({
  display: 'block',
  textDecoration: 'none',
  color: 'inherit',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 1.25,
  overflow: 'hidden',
  backgroundColor: theme.palette.background.paper,
  WebkitTapHighlightColor: 'transparent',
  transition: 'transform 180ms cubic-bezier(0.4, 0, 0.2, 1)',
  '&:active': {
    transform: 'scale(0.97)',
  },
  '@media (prefers-reduced-motion: reduce)': {
    transition: 'none',
    '&:active': {
      transform: 'none',
    },
  },
})) as typeof Box;
