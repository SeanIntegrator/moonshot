import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';
import { SurfaceCard } from './ui/SurfaceCard.js';

type Props = {
  displayId: string;
  name?: string;
  stamps?: number;
  stampsPerReward?: number;
  size?: number;
};

export function QrCard({ displayId, name, stamps, stampsPerReward = 10, size = 200 }: Props) {
  const subtitle = [
    name,
    `ID ${displayId}`,
    stamps != null ? `★ ${stamps}/${stampsPerReward}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: 'block',
          mb: 1
        }}>
        Show at till
      </Typography>
      <SurfaceCard
        sx={{
          display: 'inline-flex',
          p: 2,
        }}
      >
        <QRCodeSVG value={displayId} size={size} level="M" />
      </SurfaceCard>
      {subtitle && (
        <Typography
          variant="body2"
          sx={{
            fontWeight: 600,
            mt: 1.5
          }}>
          {subtitle}
        </Typography>
      )}
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          display: 'block',
          mt: 0.5
        }}>
        Turn brightness up for best scan
      </Typography>
    </Box>
  );
}
