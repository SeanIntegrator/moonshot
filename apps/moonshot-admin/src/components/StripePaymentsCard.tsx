import { Alert, Box, Button, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { AdminStripeAccountStatusResponse } from '@moonshot/types';
import { useCallback, useEffect, useState } from 'react';
import { adminStripeOnboardingLink, adminStripeStatus } from '../lib/admin-api.js';
import { isStripeServerUnavailable } from '../console/pages/overview/stripe-connection.js';

type Props = {
  token: string;
  /** Set by onboarding wizard after Stripe Connect return redirect */
  stripeReturnNotice?: boolean;
  /** Called when the connected account can charge (onboarding can leave this step). */
  onChargesEnabled?: () => void;
};

export function StripePaymentsCard({
  token,
  stripeReturnNotice = false,
  onChargesEnabled,
}: Props) {
  const [status, setStatus] = useState<AdminStripeAccountStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ severity: 'success' | 'warning'; text: string } | null>(
    null,
  );

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminStripeStatus(token)
      .then((s) => setStatus(s))
      .catch((e) => {
        const msg = e instanceof Error ? e.message : 'Failed to load Stripe status';
        setError(isStripeServerUnavailable(msg) ? 'unavailable' : msg);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (status?.chargesEnabled) {
      onChargesEnabled?.();
    }
  }, [status?.chargesEnabled, onChargesEnabled]);

  useEffect(() => {
    if (stripeReturnNotice) {
      setNotice({ severity: 'success', text: 'Stripe setup updated. Status refreshed below.' });
      load();
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('stripeConnect');
    if (!outcome) return;
    if (outcome === 'return') {
      setNotice({ severity: 'success', text: 'Stripe setup updated. Status refreshed below.' });
      load();
    } else if (outcome === 'error') {
      setNotice({
        severity: 'warning',
        text: 'Could not complete Stripe redirect. Use Refresh status or try Connect again.',
      });
    }
    params.delete('stripeConnect');
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState(null, '', next);
  }, [load, stripeReturnNotice]);

  async function openOnboarding(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const { url } = await adminStripeOnboardingLink(token);
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start onboarding';
      setError(isStripeServerUnavailable(msg) ? 'unavailable' : msg);
    } finally {
      setBusy(false);
    }
  }

  const stripeUnavailable =
    status?.configured === false ||
    error === 'unavailable' ||
    (error !== null && isStripeServerUnavailable(error));

  return (
    <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "flex-start",
          justifyContent: "space-between"
        }}>
        <Typography variant="h6" gutterBottom>
          Enable Stripe payments
        </Typography>
        {!stripeUnavailable && (
          <Tooltip title="Refresh status">
            <span>
              <IconButton size="small" disabled={busy} onClick={() => load()} aria-label="Refresh Stripe status">
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        )}
      </Stack>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 2
        }}>
        Order-ahead uses Stripe when payment provider is set to Stripe. Customers cannot place paid orders until
        charges are enabled on the connected account.
      </Typography>
      {notice && (
        <Alert severity={notice.severity} sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice.text}
        </Alert>
      )}
      {stripeUnavailable ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Online card payments aren&apos;t available in this environment yet. Your café accepts{' '}
          <strong>pay-in-store</strong> orders — skip this step to finish setup, or connect Stripe later
          from the dashboard.
        </Alert>
      ) : (
        error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )
      )}
      {stripeUnavailable ? null : loading || !status ? (
        <Typography sx={{
          color: "text.secondary"
        }}>Loading Stripe status…</Typography>
      ) : (
        <Stack spacing={2}>
          {status.chargesEnabled && (
            <Stack
              direction="row"
              spacing={1}
              sx={{
                alignItems: "center",
                color: 'success.main'
              }}>
              <CheckCircleIcon fontSize="small" />
              <Typography variant="body2" sx={{
                fontWeight: 600
              }}>
                Stripe connected
              </Typography>
            </Stack>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {status.chargesEnabled && onChargesEnabled && (
              <Button variant="contained" onClick={() => onChargesEnabled()}>
                Finish setup
              </Button>
            )}
            <Button
              variant={status.chargesEnabled ? 'outlined' : 'contained'}
              disabled={busy}
              onClick={() => void openOnboarding()}
            >
              {status.chargesEnabled
                ? 'Visit Stripe portal'
                : status.accountId
                  ? 'Continue Stripe setup'
                  : 'Connect with Stripe'}
            </Button>
          </Box>
        </Stack>
      )}
    </Paper>
  );
}
