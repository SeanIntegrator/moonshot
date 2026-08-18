import { Box } from '@mui/material';
import { PageHeader } from '../primitives/PageHeader.js';
import { AccessCard } from './kitchen/AccessCard.js';
import { AlertsCard } from './kitchen/AlertsCard.js';
import { DisplayCard } from './kitchen/DisplayCard.js';
import { EtaCard } from './kitchen/EtaCard.js';
import { LayoutCard } from './kitchen/LayoutCard.js';
import { PickupCard } from './kitchen/PickupCard.js';

export function KitchenPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader
        title="Kitchen"
        description="How orders reach the kitchen display, and how it behaves."
      />
      <PickupCard />
      <DisplayCard />
      <LayoutCard />
      <EtaCard />
      <AlertsCard />
      <AccessCard />
    </Box>
  );
}
