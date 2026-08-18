import { Box, Paper, Skeleton } from '@mui/material';

const CHIP_COUNT = 5;
const ROW_COUNT = 6;

/** Filter chips + StockOptionRow-height rows. */
export function StockPageSkeleton() {
  return (
    <Paper
      sx={(theme) => ({
        p: { xs: 2, sm: 3 },
        border: `1px solid ${theme.console.card.border}`,
        borderRadius: `${theme.console.card.radiusPx}px`,
        overflow: 'hidden',
      })}
    >
      <Skeleton variant="text" width="28%" height={28} sx={{ mb: 2 }} />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
        {Array.from({ length: CHIP_COUNT }, (_, i) => (
          <Skeleton key={i} variant="rounded" width={72} height={32} sx={{ borderRadius: 999 }} />
        ))}
      </Box>
      {Array.from({ length: ROW_COUNT }, (_, i) => (
        <Box
          key={i}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            py: 2.25,
          }}
        >
          <Skeleton variant="circular" width={32} height={32} />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Skeleton variant="text" width="40%" height={20} />
            <Skeleton variant="text" width="28%" height={16} />
          </Box>
          <Skeleton variant="rounded" width={220} height={36} />
        </Box>
      ))}
    </Paper>
  );
}
