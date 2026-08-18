import { Box, Typography, type SxProps, type Theme } from '@mui/material';
import type { ReactNode } from 'react';

export const kitchenFieldGridSx: SxProps<Theme> = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
  gap: 2,
};

/** Small-caps block label inside a kitchen settings card. */
export function KitchenSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Box>
      <Typography
        variant="caption"
        sx={{ letterSpacing: '0.08em', fontWeight: 600, display: 'block', mb: 1.5 }}
      >
        {title}
      </Typography>
      {children}
    </Box>
  );
}
