import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { surfaceCardChrome } from '../../theme/surfaceCardChrome.js';

/**
 * Elevated secondary card surface — paper fill, divider border, subtle theme shadow.
 * Prefer this over hand-rolled bordered Boxes for card chrome.
 */
export const SurfaceCard = styled(Box)(({ theme }) => ({
  ...surfaceCardChrome(theme),
  borderRadius: theme.shape.borderRadius * 1.25,
})) as typeof Box;
