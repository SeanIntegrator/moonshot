import CheckIcon from '@mui/icons-material/Check';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import { Box, Button, Typography } from '@mui/material';

type Props = {
  filled: number;
  total: number;
  onShowQr?: () => void;
  variant?: 'hero' | 'card';
};

export function LoyaltyStampCard({ filled, total, onShowQr, variant = 'card' }: Props) {
  const remaining = Math.max(0, total - filled);

  return (
    <Box
      sx={{
        ...(variant === 'hero'
          ? { bgcolor: 'rgba(255,255,255,0.08)', borderRadius: 1.25, p: 1.5, mt: 2 }
          : {
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.25,
              p: 2,
              bgcolor: 'background.paper',
            }),
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography
          variant="body2"
          fontWeight={600}
          sx={{ color: variant === 'hero' ? 'inherit' : 'text.primary' }}
        >
          {filled}/{total} stamps
        </Typography>
        {onShowQr && (
          <Button
            size="small"
            variant={variant === 'hero' ? 'contained' : 'outlined'}
            startIcon={<QrCode2Icon fontSize="small" />}
            onClick={onShowQr}
            sx={
              variant === 'hero'
                ? { bgcolor: 'background.paper', color: 'text.primary', '&:hover': { bgcolor: 'grey.100' } }
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
              bgcolor: i < filled ? 'primary.main' : 'transparent',
              border: i < filled ? 'none' : '1px dashed',
              borderColor: variant === 'hero' ? 'rgba(255,255,255,0.35)' : 'divider',
            }}
          >
            {i < filled && <CheckIcon sx={{ fontSize: 14, color: 'primary.contrastText' }} />}
          </Box>
        ))}
      </Box>
      {remaining > 0 && (
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 1, opacity: variant === 'hero' ? 0.85 : 1, color: 'text.secondary' }}
        >
          {remaining === 1 ? '1 reward available' : `${remaining} more for a free drink`}
        </Typography>
      )}
    </Box>
  );
}
