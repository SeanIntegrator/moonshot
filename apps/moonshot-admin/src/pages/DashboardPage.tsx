import { Stack } from '@mui/material';
import { StripePaymentsCard } from '../components/StripePaymentsCard.js';
import type { AdminSession } from '../context/AuthContext.js';

type Props = {
  session: AdminSession;
};

/** Unrouted reference. Console pages live under `/overview` and the other v3 tabs. */
export function DashboardPage({ session }: Props) {
  return (
    <Stack spacing={3}>
      <StripePaymentsCard token={session.token} />
    </Stack>
  );
}
