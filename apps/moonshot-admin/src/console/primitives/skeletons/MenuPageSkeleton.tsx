import { Box, Paper, Skeleton } from '@mui/material';

const SIDEBAR_ROWS = 8;

/** Tabs + item list + 240px photo square + fields — matches ItemsTab layout. */
export function MenuPageSkeleton() {
  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
        {['Items', 'Milk', 'Syrup', 'Beans'].map((label) => (
          <Skeleton key={label} variant="rounded" width={72} height={32} />
        ))}
      </Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'flex-start',
          gap: 2.5,
        }}
      >
        <Paper
          sx={(theme) => ({
            width: { xs: '100%', md: 280 },
            flex: '0 0 auto',
            border: `1px solid ${theme.console.card.border}`,
            borderRadius: `${theme.console.card.radiusPx}px`,
            overflow: 'hidden',
          })}
        >
          <Box sx={{ p: 1.5 }}>
            <Skeleton variant="rounded" height={40} />
          </Box>
          {Array.from({ length: SIDEBAR_ROWS }, (_, i) => (
            <Box key={i} sx={{ px: 2, py: 1.25, display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Skeleton variant="text" width="70%" height={20} />
              <Skeleton variant="text" width={40} height={16} sx={{ ml: 'auto' }} />
            </Box>
          ))}
        </Paper>
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <Skeleton variant="text" width="40%" height={32} sx={{ mb: 2 }} />
          <Box
            sx={{
              display: 'grid',
              gap: 2.5,
              gridTemplateColumns: { xs: '1fr', md: '240px 1fr' },
              alignItems: 'start',
            }}
          >
            <Skeleton variant="rounded" width={240} height={240} sx={{ maxWidth: '100%' }} />
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Skeleton variant="rounded" height={40} />
              <Skeleton variant="rounded" height={40} />
              <Skeleton variant="rounded" height={40} />
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
