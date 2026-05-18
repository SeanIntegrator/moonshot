import { Alert, Box, Button, Paper, Stack, Typography } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { adminStripeOnboardingLink, adminStripeStatus } from '../lib/admin-api.js';

type Props = {
  token: string;
};

export function StripePaymentsCard({ token }: Props) {
  const [status, setStatus] = useState<{
    accountId: string | null;
    chargesEnabled: boolean;
    detailsSubmitted: boolean;
    payoutsEnabled: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminStripeStatus(token)
      .then((s) => setStatus(s))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load Stripe status'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  async function openOnboarding(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const { url } = await adminStripeOnboardingLink(token);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start onboarding');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Online payments (Stripe Connect)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Order-ahead uses Stripe when payment provider is set to Stripe. Customers cannot place paid orders until
        charges are enabled on the connected account.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {loading || !status ? (
        <Typography color="text.secondary">Loading Stripe status…</Typography>
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2">
            Account: {status.accountId ?? '— (not created yet)'}
          </Typography>
          <Typography variant="body2">Charges enabled: {status.chargesEnabled ? 'yes' : 'no'}</Typography>
          <Typography variant="body2">Details submitted: {status.detailsSubmitted ? 'yes' : 'no'}</Typography>
          <Typography variant="body2">Payouts enabled: {status.payoutsEnabled ? 'yes' : 'no'}</Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
            <Button variant="contained" disabled={busy} onClick={() => void openOnboarding()}>
              {status.accountId ? 'Continue Stripe setup' : 'Connect with Stripe'}
            </Button>
            <Button variant="outlined" disabled={busy} onClick={() => load()}>
              Refresh status
            </Button>
          </Box>
        </Stack>
      )}
    </Paper>
  );
}
