import { Box } from '@mui/material';
import { PageHeader } from '../primitives/PageHeader.js';
import { AccessCard } from './kitchen/AccessCard.js';
import { AlertsCard } from './kitchen/AlertsCard.js';
import { KitchenDisplayCard } from './kitchen/KitchenDisplayCard.js';
import { PickupCard } from './kitchen/PickupCard.js';

export function KitchenPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader
        title="Kitchen"
        description="How orders reach the kitchen display, and how it behaves."
      />
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          alignItems: 'start',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 0 }}>
          <PickupCard />
          <AlertsCard />
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, minWidth: 0 }}>
          <KitchenDisplayCard />
          <AccessCard />
        </Box>
      </Box>
    </Box>
  );
}
