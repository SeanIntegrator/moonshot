import { Box, Container, Skeleton } from '@mui/material';
import { CONSOLE_TABS } from '../../console-nav.js';
import { PageCardsSkeleton } from './PageCardsSkeleton.js';

/** First-paint stand-in for AdminShell while CafeProvider loads the café. */
export function ConsoleChromeSkeleton() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={(theme) => ({
          bgcolor: '#fff',
          borderBottom: `1px solid ${theme.console.card.border}`,
        })}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              py: 1.5,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Skeleton variant="text" width={140} height={22} />
              <Skeleton variant="text" width={180} height={18} />
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Skeleton variant="rounded" width={88} height={24} />
              <Skeleton variant="text" width={160} height={18} sx={{ display: { xs: 'none', sm: 'block' } }} />
            </Box>
          </Box>
          <Box
            sx={{
              display: 'flex',
              gap: { xs: 1, sm: 2 },
              overflow: 'hidden',
            }}
          >
            {CONSOLE_TABS.map((tab) => (
              <Skeleton key={tab.to} variant="text" width={72} height={36} />
            ))}
          </Box>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
        <PageCardsSkeleton columns={2} cards={4} lines={4} />
      </Container>
    </Box>
  );
}
