import { Box } from '@mui/material';
import { PageHeader } from '../primitives/PageHeader.js';
import { CustomerLinkCard } from './order-ahead/CustomerLinkCard.js';
import { LoyaltyCard } from './order-ahead/LoyaltyCard.js';
import { PaymentsCard } from './order-ahead/PaymentsCard.js';

export function OrderAheadPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader
        title="Order ahead"
        description="How ordering works for customers, and what they get for coming back."
      />
      <LoyaltyCard />
      <CustomerLinkCard />
      <PaymentsCard />
    </Box>
  );
}
