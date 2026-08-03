import { Typography } from '@mui/material';
import { SurfaceCard } from './ui/SurfaceCard.js';

type Props = {
  value: string | number;
  label: string;
};

export function ProfileStatCard({ value, label }: Props) {
  return (
    <SurfaceCard sx={{ flex: 1, p: 1.5, textAlign: 'center' }}>
      <Typography variant="h5" fontWeight={700}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </SurfaceCard>
  );
}
