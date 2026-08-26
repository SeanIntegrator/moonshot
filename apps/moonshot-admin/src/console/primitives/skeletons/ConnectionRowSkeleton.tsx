import { Box, Skeleton } from '@mui/material';

/** Matches ConnectionRow geometry so the row swap does not shift the card. */
export function ConnectionRowSkeleton() {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
      }}
    >
      <Skeleton variant="rounded" width={60} height={20} sx={{ flexShrink: 0, borderRadius: 0.75 }} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Skeleton variant="text" width="28%" height={20} />
        <Skeleton variant="text" width="42%" height={18} sx={{ mt: 0.25 }} />
        <Skeleton variant="text" width="72%" height={18} sx={{ mt: 0.25 }} />
      </Box>
      <Skeleton variant="rounded" width={88} height={30} sx={{ flexShrink: 0, borderRadius: 1 }} />
    </Box>
  );
}
