import type { AdminStripeAccountStatusResponse } from '@moonshot/types';
import { Box, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../../context/AuthContext.js';
import { adminStripeStatus } from '../../../lib/admin-api.js';
import { stripeRowView } from '../overview/stripe-connection.js';
import { connectionDotColor } from '../../primitives/connection-tone.js';
import { DeepLinkFooter } from '../../primitives/DeepLinkFooter.js';
import { ReadOnlyPanel } from '../../primitives/ReadOnlyPanel.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { CardSkeleton } from '../../primitives/skeletons/CardSkeleton.js';
import { useToast } from '../../primitives/ToastProvider.js';

export function PaymentsCard() {
  const { session } = useAuth();
  const toast = useToast();
  const [stripe, setStripe] = useState<AdminStripeAccountStatusResponse | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!session) return;
    void adminStripeStatus(session.token)
      .then(setStripe)
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Failed to load Stripe';
        if (/not configured|STRIPE_/i.test(msg)) {
          setStripe({
            configured: false,
            accountId: null,
            chargesEnabled: false,
            detailsSubmitted: false,
            payoutsEnabled: false,
          });
          return;
        }
        toast({ severity: 'error', message: msg });
      })
      .finally(() => setLoaded(true));
  }, [session, toast]);

  const view = useMemo(() => stripeRowView(stripe), [stripe]);
  const dot = connectionDotColor(view.tone);

  if (!loaded) {
    return <CardSkeleton lines={3} />;
  }

  return (
    <SettingsCard title="Payments" description="Managed in your Stripe dashboard.">
      <ReadOnlyPanel source="stripe" helper="Change this on Overview.">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box
            sx={(theme) => ({
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor:
                dot === 'healthy'
                  ? theme.console.connection.healthy
                  : dot === 'stale'
                    ? theme.console.connection.stale
                    : theme.console.connection.failed,
            })}
          />
          <Typography sx={{ fontWeight: 700 }}>{view.statusLabel}</Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 0.75 }}>
          {view.meta}
        </Typography>
      </ReadOnlyPanel>
      <Box sx={{ mt: 1.5 }}>
        <DeepLinkFooter to="/overview">Connections on Overview</DeepLinkFooter>
      </Box>
    </SettingsCard>
  );
}
