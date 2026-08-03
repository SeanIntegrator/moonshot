import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { surfaceCardChrome } from '../../theme/surfaceCardChrome.js';

/**
 * Card/link surface with theme-aware chrome and tap scale feedback.
 * Replaces the former `.pressable-card` CSS class so radius/borders follow the café theme.
 */
export const PressableCard = styled(Box)(({ theme }) => ({
  ...surfaceCardChrome(theme),
  display: 'block',
  textDecoration: 'none',
  color: 'inherit',
  borderRadius: theme.radii.card,
  overflow: 'hidden',
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
