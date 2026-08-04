import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
  sx?: object;
};

export function SectionHead({ eyebrow, title, action, sx }: Props) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 1.5, ...sx }}>
      <Box>
        {eyebrow && (
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              letterSpacing: 0.5,
              textTransform: 'uppercase'
            }}>
            {eyebrow}
          </Typography>
        )}
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mt: eyebrow ? 0.25 : 0
          }}>
          {title}
        </Typography>
      </Box>
      {action}
    </Box>
  );
}
