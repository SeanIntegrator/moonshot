import { Box } from '@mui/material';
import { useAuth } from '../../context/AuthContext.js';
import { useCafe } from '../CafeProvider.js';
import { ConnectionsCard } from './overview/ConnectionsCard.js';
import { HoursSummaryCard } from './overview/HoursSummaryCard.js';
import { OutOfStockCard } from './overview/OutOfStockCard.js';
import { OverviewHero } from './overview/OverviewHero.js';

export function OverviewPage() {
  const { cafe } = useCafe();
  const { session } = useAuth();
  if (!session) return null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <OverviewHero hours={cafe.hours} timeZone={cafe.timezone} />
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          alignItems: 'start',
        }}
      >
        <HoursSummaryCard hours={cafe.hours} timeZone={cafe.timezone} />
        <ConnectionsCard token={session.token} timeZone={cafe.timezone} />
      </Box>
      <OutOfStockCard token={session.token} />
    </Box>
  );
}
