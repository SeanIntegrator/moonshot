import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import CheckIcon from '@mui/icons-material/Check';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { Box, Button, Typography } from '@mui/material';
import {
  LoyaltyCardShell,
  LoyaltyHeroQrButton,
  LoyaltyHeroShell,
  LoyaltyRewardsLink,
  LoyaltyStampSlot,
} from './ui/LoyaltySurfaces.js';

type Props = {
  filled: number;
  total: number;
  rewardsAvailable?: number;
  onShowQr?: () => void;
  /** When set, the rewards footer (icon + copy + chevron) is tappable. */
  onRewardsClick?: () => void;
  variant?: 'hero' | 'card';
};

function loyaltyFooterMessage(rewardsAvailable: number, filled: number, total: number): string {
  if (rewardsAvailable > 0) {
    return rewardsAvailable === 1 ? '1 reward available' : `${rewardsAvailable} rewards available`;
  }
  const drinksUntil = Math.max(0, total - filled);
  return drinksUntil === 1 ? '1 drink until next reward' : `${drinksUntil} drinks until next reward`;
}

export function LoyaltyStampCard({
  filled,
  total,
  rewardsAvailable = 0,
  onShowQr,
  onRewardsClick,
  variant = 'card',
}: Props) {
  const hero = variant === 'hero';
  const footer = loyaltyFooterMessage(rewardsAvailable, filled, total);
  const hasReward = rewardsAvailable > 0;
  const showRewardsLink = hasReward && Boolean(onRewardsClick);
  const Shell = hero ? LoyaltyHeroShell : LoyaltyCardShell;

  return (
    <Shell>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography
          variant="caption"
          fontWeight={600}
          sx={{
            color: hero ? 'inherit' : 'text.secondary',
            letterSpacing: 0.5,
            textTransform: 'uppercase',
            opacity: hero ? 0.85 : 1,
          }}
        >
          Loyalty
        </Typography>
        {onShowQr &&
          (hero ? (
            <LoyaltyHeroQrButton size="small" variant="contained" startIcon={<QrCode2Icon fontSize="small" />} onClick={onShowQr}>
              Show QR
            </LoyaltyHeroQrButton>
          ) : (
            <Button size="small" variant="outlined" startIcon={<QrCode2Icon fontSize="small" />} onClick={onShowQr}>
              Show QR
            </Button>
          ))}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 0.75,
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <LoyaltyStampSlot key={i} filled={i < filled} hero={hero}>
            {i < filled && (
              <CheckIcon sx={{ fontSize: 14, color: hero ? 'primary.main' : 'primary.contrastText' }} />
            )}
          </LoyaltyStampSlot>
        ))}
      </Box>
      {hasReward ? (
        showRewardsLink ? (
          <LoyaltyRewardsLink
            onClick={onRewardsClick}
            sx={{
              opacity: hero ? 0.9 : 1,
              color: hero ? 'inherit' : 'text.secondary',
            }}
          >
            <CardGiftcardIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption" sx={{ color: 'inherit' }}>
              {footer}
            </Typography>
            <ChevronRightIcon sx={{ fontSize: 14 }} />
          </LoyaltyRewardsLink>
        ) : (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: 0.5,
              mt: 1,
              width: '100%',
              opacity: hero ? 0.9 : 1,
              color: hero ? 'inherit' : 'text.secondary',
            }}
          >
            <CardGiftcardIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption" sx={{ color: 'inherit' }}>
              {footer}
            </Typography>
          </Box>
        )
      ) : (
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 1,
            opacity: hero ? 0.9 : 1,
            color: hero ? 'inherit' : 'text.secondary',
          }}
        >
          {footer}
        </Typography>
      )}
    </Shell>
  );
}
