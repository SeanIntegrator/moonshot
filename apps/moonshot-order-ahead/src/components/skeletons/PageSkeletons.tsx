import { Box, Container, Skeleton } from '@mui/material';
import { pageContentWidthSx } from '../../theme/pageLayout.js';

function MenuCardSkeleton() {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25, overflow: 'hidden' }}>
      <Skeleton variant="rectangular" sx={{ aspectRatio: '1', width: '100%' }} />
      <Box sx={{ p: 1.25, display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width={40} height={16} />
      </Box>
    </Box>
  );
}

export function MenuPageSkeleton() {
  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 14 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5, gap: 1 }}>
        <Skeleton variant="text" width={80} height={36} />
        <Skeleton variant="rounded" width={120} height={32} sx={{ borderRadius: 999 }} />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, py: 1.5 }}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" width={72} height={32} sx={{ borderRadius: 999, flexShrink: 0 }} />
        ))}
      </Box>

      {[1, 2].map((section) => (
        <Box key={section} sx={{ mb: 3 }}>
          <Skeleton variant="text" width={140} height={16} sx={{ mb: 1 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.25 }}>
            {[1, 2, 3, 4].map((i) => (
              <MenuCardSkeleton key={i} />
            ))}
          </Box>
        </Box>
      ))}
    </Container>
  );
}

export function HomePageSkeleton() {
  return (
    <Container maxWidth="sm" sx={{ py: 0, pb: 10, px: 0 }}>
      <Box sx={{ px: 2, pt: 2, pb: 3, minHeight: 320 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={120} height={16} />
            <Skeleton variant="text" width={200} height={40} sx={{ mt: 0.5 }} />
          </Box>
          <Skeleton variant="circular" width={36} height={36} />
        </Box>
        <Skeleton variant="rounded" height={100} sx={{ borderRadius: 1.25, mb: 2 }} />
        <Skeleton variant="rounded" height={56} sx={{ borderRadius: 1.25 }} />
      </Box>

      <Box sx={{ px: 2, pt: 2 }}>
        <Skeleton variant="text" width={100} height={16} sx={{ mb: 0.5 }} />
        <Skeleton variant="text" width={140} height={28} sx={{ mb: 1.5 }} />
        <Box sx={{ display: 'flex', gap: 1.5, overflow: 'hidden' }}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" width={180} height={160} sx={{ borderRadius: 1.25, flexShrink: 0 }} />
          ))}
        </Box>
      </Box>
    </Container>
  );
}

export function ItemDetailSkeleton() {
  return (
    <Box sx={{ pb: 14, minHeight: '100dvh' }}>
      <Skeleton variant="rectangular" sx={{ height: { xs: 220, sm: '25vh' } }} />
      <Container maxWidth="sm" sx={{ py: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1 }}>
          <Skeleton variant="text" width="55%" height={36} />
          <Skeleton variant="text" width={48} height={24} />
        </Box>
        <Skeleton variant="text" width="90%" height={20} />
        <Skeleton variant="text" width="70%" height={20} sx={{ mt: 0.5 }} />

        <Box sx={{ mt: 3 }}>
          <Skeleton variant="text" width={60} height={24} sx={{ mb: 1 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} variant="rounded" height={64} sx={{ borderRadius: 1.25 }} />
            ))}
          </Box>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Skeleton variant="text" width={80} height={24} sx={{ mb: 1 }} />
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} variant="rounded" width={88} height={32} sx={{ borderRadius: 999 }} />
            ))}
          </Box>
        </Box>
      </Container>

      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          px: 2,
          py: 1.5,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1.5,
          alignItems: 'center',
          bgcolor: 'background.paper',
          ...pageContentWidthSx,
        }}
      >
        <Skeleton variant="rounded" width={120} height={40} sx={{ borderRadius: 999 }} />
        <Skeleton variant="rounded" height={48} sx={{ flex: 1, borderRadius: 1 }} />
      </Box>
    </Box>
  );
}

function CheckoutLineSkeleton() {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', px: 1.5, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
      <Skeleton variant="rounded" width={48} height={48} sx={{ borderRadius: 1, flexShrink: 0 }} />
      <Box sx={{ flex: 1 }}>
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="40%" height={16} />
      </Box>
      <Skeleton variant="text" width={48} height={20} />
    </Box>
  );
}

export function CheckoutPageSkeleton() {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Container maxWidth="sm" sx={{ flex: 1, py: 2, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width={120} height={32} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Skeleton variant="text" width={100} height={24} />
            <Skeleton variant="text" width={60} height={20} />
          </Box>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25, overflow: 'hidden' }}>
            <CheckoutLineSkeleton />
            <CheckoutLineSkeleton />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', px: 1.5, py: 1.25 }}>
              <Skeleton variant="text" width={48} height={24} />
              <Skeleton variant="text" width={64} height={24} />
            </Box>
          </Box>
          <Skeleton variant="text" width={100} height={24} sx={{ mt: 3, mb: 1 }} />
          <Skeleton variant="rounded" height={72} sx={{ borderRadius: 1.25 }} />
        </Box>
        <Skeleton variant="rounded" height={52} sx={{ mt: 2, borderRadius: 1 }} />
      </Container>
    </Box>
  );
}
