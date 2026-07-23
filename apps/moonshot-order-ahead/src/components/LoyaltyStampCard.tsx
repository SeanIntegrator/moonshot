import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import CheckIcon from '@mui/icons-material/Check';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { Box, Button, Typography } from '@mui/material';

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

  return (
    <Box
      sx={{
        ...(hero
          ? {
              bgcolor: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 1.5,
              p: 1.5,
              mt: 2,
            }
          : {
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.5,
              p: 2,
              bgcolor: 'background.paper',
            }),
      }}
    >
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
        {onShowQr && (
          <Button
            size="small"
            variant={hero ? 'contained' : 'outlined'}
            startIcon={<QrCode2Icon fontSize="small" />}
            onClick={onShowQr}
            sx={
              hero
                ? {
                    bgcolor: 'rgba(255,255,255,0.12)',
                    color: 'common.white',
                    border: '1px solid rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  }
                : undefined
            }
          >
            Show QR
          </Button>
        )}
      </Box>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: 0.75,
        }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <Box
            key={i}
            sx={{
              aspectRatio: '1',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: i < filled ? (hero ? 'common.white' : 'primary.main') : 'transparent',
              border: i < filled ? 'none' : '1px dashed',
              borderColor: hero ? 'rgba(255,255,255,0.35)' : 'divider',
            }}
          >
            {i < filled && (
              <CheckIcon sx={{ fontSize: 14, color: hero ? 'primary.main' : 'primary.contrastText' }} />
            )}
          </Box>
        ))}
      </Box>
      {hasReward ? (
        <Box
          component={showRewardsLink ? 'button' : 'div'}
          {...(showRewardsLink ? { type: 'button' as const, onClick: onRewardsClick } : {})}
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 0.5,
            mt: 1,
            width: '100%',
            opacity: hero ? 0.9 : 1,
            color: hero ? 'inherit' : 'text.secondary',
            ...(showRewardsLink
              ? {
                  appearance: 'none',
                  border: 0,
                  background: 'none',
                  p: 0,
                  cursor: 'pointer',
                  font: 'inherit',
                  textAlign: 'inherit',
                }
              : null),
          }}
        >
          <CardGiftcardIcon sx={{ fontSize: 14 }} />
          <Typography variant="caption" sx={{ color: 'inherit' }}>
            {footer}
          </Typography>
          {showRewardsLink && <ChevronRightIcon sx={{ fontSize: 14 }} />}
        </Box>
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
    </Box>
  );
}
