import { Box, Typography } from '@mui/material';
import type { ServiceStatus } from '../service-status.js';

export function StatusPill({ status }: { status: ServiceStatus }) {
  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1.25,
        py: 0.5,
        borderRadius: 999,
        border: `1px solid ${theme.console.card.border}`,
        bgcolor: '#fff',
      })}
    >
      <Box
        sx={(theme) => ({
          width: 8,
          height: 8,
          borderRadius: '50%',
          bgcolor:
            status.kind === 'taking_orders'
              ? theme.console.status.takingOrders
              : status.kind === 'paused'
                ? theme.console.status.paused
                : theme.console.status.closed,
        })}
      />
      <Typography sx={{ fontSize: 13, fontWeight: 500, color: 'text.primary' }}>
        {status.label}
      </Typography>
    </Box>
  );
}
