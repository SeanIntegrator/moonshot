import { Alert, Box, Button, Typography } from '@mui/material';
import type { AdminStripeAccountStatusResponse } from '@moonshot/types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StripeLogo } from '../../console/pages/overview/ServiceLogos.js';
import {
  isStripeServerUnavailable,
  stripeRowView,
} from '../../console/pages/overview/stripe-connection.js';
import { ConnectionRowSkeleton } from '../../console/primitives/skeletons/ConnectionRowSkeleton.js';
import { buttonLoader } from '../../console/primitives/button-loader.js';
import { adminStripeOnboardingLink, adminStripeStatus } from '../../lib/admin-api.js';

type Props = {
  token: string;
  stripeReturnNotice: boolean;
  busy: boolean;
  onComplete: () => void | Promise<void>;
};

/** Transient POST /complete failures should retry; stop before hammering a persistent error. */
const AUTO_FINISH_MAX_ATTEMPTS = 3;

/**
 * Payments step — exactly two actions: Connect with Stripe, or skip and add later.
 * Status refreshes automatically on mount / Stripe return; no refresh icon or Finish button.
 */
export function PaymentsStep({ token, stripeReturnNotice, busy, onComplete }: Props) {
  const [status, setStatus] = useState<AdminStripeAccountStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectBusy, setConnectBusy] = useState(false);
  const completedRef = useRef(false);
  const autoFinishAttemptsRef = useRef(0);

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
    if (!stripeReturnNotice) return;
    load();
  }, [stripeReturnNotice, load]);

  useEffect(() => {
    if (!status?.chargesEnabled || completedRef.current || busy) return;
    if (autoFinishAttemptsRef.current >= AUTO_FINISH_MAX_ATTEMPTS) return;

    autoFinishAttemptsRef.current += 1;
    completedRef.current = true;
    void Promise.resolve(onComplete()).catch(() => {
      // Finish failed — drop the latch so a later idle pass can retry.
      completedRef.current = false;
    });
  }, [status?.chargesEnabled, onComplete, busy]);

  async function openOnboarding() {
    setConnectBusy(true);
    setError(null);
    try {
      const { url } = await adminStripeOnboardingLink(token);
      window.location.href = url;
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start Stripe setup';
      setError(isStripeServerUnavailable(msg) ? 'unavailable' : msg);
      setConnectBusy(false);
    }
  }

  const stripeUnavailable =
    status?.configured === false ||
    error === 'unavailable' ||
    (error !== null && isStripeServerUnavailable(error));

  const view = status && !stripeUnavailable ? stripeRowView(status) : null;
  const actionBusy = busy || connectBusy;

  return (
    <Box>
      <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>
        Choose how to get paid
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
        Connect Stripe to take card payments online, or skip for now and collect payment in store.
        You can add Stripe anytime from Connections in the console.
      </Typography>

      {stripeReturnNotice && !status?.chargesEnabled ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Checking your Stripe account…
        </Alert>
      ) : null}

      {stripeUnavailable ? (
        <Alert severity="info" sx={{ mb: 2 }}>
          Online card payments aren&apos;t available in this environment yet. You can finish setup
          with pay-in-store and connect Stripe later.
        </Alert>
      ) : null}

      {error && error !== 'unavailable' ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {!stripeUnavailable && (loading || !status) ? (
        <Box sx={{ mb: 2 }}>
          <ConnectionRowSkeleton />
        </Box>
      ) : null}

      {!stripeUnavailable && status && view ? (
        <Box
          sx={(theme) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            p: 1.75,
            mb: 2.5,
            border: `1px solid ${theme.console.card.border}`,
            borderRadius: 1.5,
            bgcolor: theme.console.readonly.fill,
          })}
        >
          <StripeLogo />
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 700 }}>{view.statusLabel}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {view.meta}
            </Typography>
          </Box>
        </Box>
      ) : null}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {!stripeUnavailable ? (
          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={actionBusy || Boolean(status?.chargesEnabled)}
            startIcon={buttonLoader(connectBusy)}
            onClick={() => void openOnboarding()}
          >
            {connectBusy
              ? 'Opening Stripe…'
              : status?.chargesEnabled
                ? 'Connected'
                : status?.accountId
                  ? 'Continue with Stripe'
                  : 'Connect with Stripe'}
          </Button>
        ) : null}
        <Button
          variant={stripeUnavailable ? 'contained' : 'outlined'}
          fullWidth
          size="large"
          disabled={actionBusy}
          startIcon={buttonLoader(busy && !connectBusy)}
          onClick={() => {
            void Promise.resolve(onComplete()).catch(() => {});
          }}
        >
          {busy ? 'Finishing…' : 'Skip now and add later'}
        </Button>
      </Box>
    </Box>
  );
}
