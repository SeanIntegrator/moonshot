import { Box, Typography } from '@mui/material';
import { QRCodeSVG } from 'qrcode.react';

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
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
        Show at till
      </Typography>
      <Box
        sx={{
          display: 'inline-flex',
          p: 2,
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.25,
          bgcolor: 'background.paper',
        }}
      >
        <QRCodeSVG value={displayId} size={size} level="M" />
      </Box>
      {subtitle && (
        <Typography variant="body2" fontWeight={600} sx={{ mt: 1.5 }}>
          {subtitle}
        </Typography>
      )}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
        Turn brightness up for best scan
      </Typography>
    </Box>
  );
}
