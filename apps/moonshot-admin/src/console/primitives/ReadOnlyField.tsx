import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  label: string;
  value: ReactNode;
};

/** Label + body text inside a read-only panel. Never an input. */
export function ReadOnlyField({ label, value }: Props) {
  return (
    <Box sx={{ '& + &': { mt: 1.25 } }}>
      <Typography variant="caption" sx={{ display: 'block', mb: 0.25 }}>
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 600, color: 'text.primary' }}>{value}</Typography>
    </Box>
  );
}
