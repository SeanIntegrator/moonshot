import { Box, Paper, Skeleton } from '@mui/material';

type Props = {
  lines?: number;
  columns?: 1 | 2;
};

/** SettingsCard-shaped placeholder: title, description, then body lines. */
export function CardSkeleton({ lines = 3, columns = 1 }: Props) {
  return (
    <Paper
      sx={(theme) => ({
        p: { xs: 2, sm: 3 },
        border: `1px solid ${theme.console.card.border}`,
        borderRadius: `${theme.console.card.radiusPx}px`,
      })}
    >
      <Skeleton variant="text" width="36%" height={28} />
      <Skeleton variant="text" width="62%" sx={{ mb: 2 }} />
      <Box
        sx={{
          display: 'grid',
          gap: 1.25,
          gridTemplateColumns: columns === 2 ? { xs: '1fr', md: '1fr 1fr' } : '1fr',
        }}
      >
        {Array.from({ length: lines }, (_, i) => (
          <Skeleton key={i} variant="rounded" height={18} />
        ))}
      </Box>
    </Paper>
  );
}
