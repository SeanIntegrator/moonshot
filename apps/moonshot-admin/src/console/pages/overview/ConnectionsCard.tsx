import type { AdminStripeAccountStatusResponse } from '@moonshot/types';
import { Alert, Divider, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adminStripeOnboardingLink,
  adminStripeStatus,
  disconnectSquare,
  getSquareConnectStatus,
  startSquareConnect,
  syncPosMenuFromSquare,
  type SquareConnectStatus,
} from '../../../lib/admin-api.js';
import { useAdminMenuSync } from '../../../hooks/useAdminMenuSync.js';
import { ConnectionRow } from '../../primitives/ConnectionRow.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { DisconnectSquareDialog } from './DisconnectSquareDialog.js';
import { SquareLogo, StripeLogo } from './ServiceLogos.js';
import { squareRowView } from './square-connection.js';
import { stripeRowView } from './stripe-connection.js';

const STRIPE_DASHBOARD = 'https://dashboard.stripe.com';

type Props = {
  token: string;
  timeZone: string;
};

export function ConnectionsCard({ token, timeZone }: Props) {
  const [square, setSquare] = useState<SquareConnectStatus | null>(null);
  const [stripe, setStripe] = useState<AdminStripeAccountStatusResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [disconnectOpen, setDisconnectOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const loadSquare = useCallback(() => {
    return getSquareConnectStatus(token)
      .then(setSquare)
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Failed to load Square');
      });
  }, [token]);

  const loadStripe = useCallback(() => {
    return adminStripeStatus(token)
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
        setError(msg);
      });
  }, [token]);

  useEffect(() => {
    void loadSquare();
    void loadStripe();
  }, [loadSquare, loadStripe]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('stripeConnect');
    if (!outcome) return;
    void loadStripe();
    params.delete('stripeConnect');
    const qs = params.toString();
    window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
  }, [loadStripe]);

  useAdminMenuSync({
    token,
    enabled: Boolean(square?.connected),
    knownSyncedAt: square?.catalogLastSyncedAt ?? null,
    onMenuSynced: (ev) => {
      setJustSynced(true);
      setSquare((prev) =>
        prev
          ? { ...prev, catalogLastSyncedAt: ev.syncedAt, catalogSyncStatus: 'idle', catalogSyncError: null }
          : prev,
      );
      window.setTimeout(() => setJustSynced(false), 4000);
    },
    onReconcileSyncDetected: () => {
      void loadSquare();
    },
  });

  const squareView = useMemo(
    () =>
      square
        ? squareRowView(square, {
            timeZone,
            justSynced,
          })
        : null,
    [square, timeZone, justSynced],
  );
  const stripeView = useMemo(() => stripeRowView(stripe), [stripe]);

  const attention =
    (squareView?.needsAttention ? 1 : 0) + (stripeView.needsAttention ? 1 : 0);

  async function runSquareAction() {
    if (!squareView) return;
    setError(null);
    try {
      if (squareView.actionKind === 'connect' || squareView.actionKind === 'reconnect') {
        const { url } = await startSquareConnect(token);
        window.location.href = url;
        return;
      }
      setSyncing(true);
      await syncPosMenuFromSquare(token);
      setJustSynced(true);
      await loadSquare();
      window.setTimeout(() => setJustSynced(false), 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Square action failed');
      await loadSquare();
    } finally {
      setSyncing(false);
    }
  }

  async function runStripeAction() {
    setError(null);
    if (stripeView.actionKind === 'dashboard') {
      window.open(STRIPE_DASHBOARD, '_blank', 'noopener,noreferrer');
      return;
    }
    try {
      const { url } = await adminStripeOnboardingLink(token);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Stripe setup');
    }
  }

  async function confirmDisconnect() {
    setDisconnecting(true);
    setError(null);
    try {
      await disconnectSquare(token);
      setDisconnectOpen(false);
      await loadSquare();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Disconnect failed');
    } finally {
      setDisconnecting(false);
    }
  }

  const title = attention > 0 ? `Connections · ${attention} need attention` : 'Connections';

  return (
    <>
      <SettingsCard title={title} description="Apps Moonshot talks to.">
        {error ? (
          <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        {squareView ? (
          <ConnectionRow
            name="Square"
            logo={<SquareLogo />}
            tone={squareView.tone}
            statusLabel={squareView.statusLabel}
            meta={squareView.meta}
            actionLabel={squareView.actionLabel}
            actionBusy={syncing || squareView.tone === 'syncing'}
            onAction={() => void runSquareAction()}
            overflow={
              squareView.showOverflow
                ? [
                    {
                      label: 'Reconnect',
                      onClick: () => {
                        void startSquareConnect(token).then(({ url }) => {
                          window.location.href = url;
                        });
                      },
                    },
                    {
                      label: 'Disconnect',
                      destructive: true,
                      onClick: () => setDisconnectOpen(true),
                    },
                  ]
                : undefined
            }
          />
        ) : (
          <Typography variant="body2">Loading Square…</Typography>
        )}
        <Divider />
        <ConnectionRow
          name="Stripe"
          logo={<StripeLogo />}
          tone={stripeView.tone}
          statusLabel={stripeView.statusLabel}
          meta={stripeView.meta}
          actionLabel={stripeView.actionLabel}
          onAction={() => void runStripeAction()}
        />
      </SettingsCard>
      <DisconnectSquareDialog
        open={disconnectOpen}
        busy={disconnecting}
        onClose={() => setDisconnectOpen(false)}
        onConfirm={() => void confirmDisconnect()}
      />
    </>
  );
}

