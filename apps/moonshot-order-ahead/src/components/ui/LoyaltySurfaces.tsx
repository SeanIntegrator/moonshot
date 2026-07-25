import Box, { type BoxProps } from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase, { type ButtonBaseProps } from '@mui/material/ButtonBase';
import { alpha, styled } from '@mui/material/styles';
import type { ComponentType } from 'react';

/** Keep stamp grid phone-sized on tablet/desktop full-bleed layouts. */
const LOYALTY_CARD_MAX_WIDTH_PX = 400;

const loyaltyCardWidth = {
  width: '100%',
  maxWidth: LOYALTY_CARD_MAX_WIDTH_PX,
  marginLeft: 'auto',
  marginRight: 'auto',
} as const;

/** Hero loyalty card shell — glass surfaces derived from cafe.heroText. */
export const LoyaltyHeroShell = styled(Box)(({ theme }) => ({
  ...loyaltyCardWidth,
  backgroundColor: alpha(theme.palette.cafe.heroText, 0.08),
  border: `1px solid ${alpha(theme.palette.cafe.heroText, 0.14)}`,
  borderRadius: theme.shape.borderRadius * 1.5,
  padding: theme.spacing(1.5),
  marginTop: theme.spacing(2),
})) as typeof Box;

/** Standard loyalty card shell. */
export const LoyaltyCardShell = styled(Box)(({ theme }) => ({
  ...loyaltyCardWidth,
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius * 1.5,
  padding: theme.spacing(2),
  backgroundColor: theme.palette.background.paper,
})) as typeof Box;

export const LoyaltyHeroQrButton = styled(Button)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.cafe.heroText, 0.12),
  color: theme.palette.common.white,
  border: `1px solid ${alpha(theme.palette.cafe.heroText, 0.2)}`,
  '&:hover': {
    backgroundColor: alpha(theme.palette.cafe.heroText, 0.2),
  },
})) as typeof Button;

export type LoyaltyStampSlotProps = BoxProps & { filled?: boolean; hero?: boolean };

export const LoyaltyStampSlot: ComponentType<LoyaltyStampSlotProps> = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'filled' && prop !== 'hero',
})<{ filled?: boolean; hero?: boolean }>(({ theme, filled, hero }) => ({
  aspectRatio: '1',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: filled
    ? hero
      ? theme.palette.common.white
      : theme.palette.primary.main
    : 'transparent',
  border: filled ? 'none' : '1px dashed',
  borderColor: hero ? alpha(theme.palette.cafe.heroText, 0.35) : theme.palette.divider,
}));

export const LoyaltyRewardsLink = styled(ButtonBase)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: theme.spacing(0.5),
  marginTop: theme.spacing(1),
  width: '100%',
  font: 'inherit',
  color: 'inherit',
})) as typeof ButtonBase;

export type LoyaltyRewardsLinkProps = ButtonBaseProps;
