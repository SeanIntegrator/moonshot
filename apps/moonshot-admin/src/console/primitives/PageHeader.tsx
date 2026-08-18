import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';

type Props = {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
};

export function PageHeader({ title, description, action }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 2,
        mb: 3,
      }}
    >
      <Box>
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {description ? (
          <Typography variant="body2" sx={{ mt: 0.75, maxWidth: 560 }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {action}
    </Box>
  );
}
