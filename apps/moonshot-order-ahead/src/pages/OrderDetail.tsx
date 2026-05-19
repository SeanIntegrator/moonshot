import type { NormalisedOrder } from '@moonshot/types';
import {
  Box,
  Button,
  Chip,
  Container,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { cancelCustomerOrder, fetchCustomerOrder } from '../api/orders-api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useOrderTracking } from '../hooks/useOrderTracking.js';
import { readOrderTracking } from '../lib/order-tracking-storage.js';

const PROGRESS_STEPS = ['Confirmed', 'Preparing', 'Ready', 'Done'] as const;

const ACTIVE_FLOW = ['pending', 'confirmed', 'preparing', 'ready'] as const;

function isCancellable(status: string): boolean {
  return (ACTIVE_FLOW as readonly string[]).includes(status);
}

export function OrderDetail() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [order, setOrder] = useState<NormalisedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  /** Guest HTTP + socket: JWT lives in sessionStorage; do not wait for `GET /orders/:id` to read it. */
  const guestTracking = useMemo(() => {
    if (!orderId.trim() || isSignedIn) return undefined;
    return readOrderTracking(orderId.trim());
  }, [orderId, isSignedIn]);

  const reload = useCallback(async () => {
    if (!orderId.trim()) return;
    try {
      const data = await fetchCustomerOrder(orderId.trim(), guestTracking ?? null);
      setOrder(data.order);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load order');
    }
  }, [orderId, guestTracking]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!order || !(ACTIVE_FLOW as readonly string[]).includes(order.status)) return;
    const id = window.setInterval(() => void reload(), 15_000);
    return () => window.clearInterval(id);
  }, [order?.id, order?.status, reload]);

  const { trackingStatus, completedAt, stepIndex, lastPickupTime } = useOrderTracking(
    order?.id ?? null,
    order?.status,
    guestTracking ?? null,
  );

  const chips = useMemo(() => {
    return PROGRESS_STEPS.map((label, i) => {
      const allDone = trackingStatus === 'completed';
      const stepComplete = allDone || i < stepIndex;
      const stepActive = !allDone && i === stepIndex;
      return (
        <Chip
          key={label}
          label={label}
          size="small"
          color={stepComplete || stepActive ? 'primary' : 'default'}
          variant={stepActive ? 'filled' : stepComplete ? 'filled' : 'outlined'}
        />
      );
    });
  }, [stepIndex, trackingStatus]);

  async function onCancel(): Promise<void> {
    if (!order || !isCancellable(order.status)) return;
    if (!window.confirm('Cancel this order at the café?')) return;
    setBusy(true);
    try {
      const data = await cancelCustomerOrder(order.id, guestTracking ?? null);
      setOrder(data.order);
      if (data.refundPending) {
        alert(
          'Order cancelled in our system. Stripe refunds are not automated yet — contact the café if you paid online.',
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Cancel failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 12 }}>
      <Button size="small" onClick={() => navigate('/')} sx={{ mb: 1 }}>
        ← Home
      </Button>
      <Typography variant="h5" component="h1" fontWeight={700}>
        Order
      </Typography>
      {error && (
        <Typography color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
      {!order && !error && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Loading…
        </Typography>
      )}
      {order && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1" fontWeight={600}>
            {order.customerName} — {order.status}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Payment: {order.paymentStatus}
          </Typography>
          {lastPickupTime && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Pickup ETA: {new Date(lastPickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Typography>
          )}
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
            Order id: {order.id}
          </Typography>

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 1.5, alignItems: 'center' }}>
            {chips}
          </Box>

          {trackingStatus === 'connecting' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Connecting for live updates…
            </Typography>
          )}
          {trackingStatus === 'tracking' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Poll this screen or stay online — we push ETAs when the queue changes.
            </Typography>
          )}
          {trackingStatus === 'error' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Live tracking unavailable — status still refreshes every {15}s while the order is open.
            </Typography>
          )}
          {trackingStatus === 'completed' && (
            <Typography variant="body2" fontWeight={600} color="success.main" sx={{ mt: 1 }}>
              Done
              {completedAt ? ` (${new Date(completedAt).toLocaleTimeString()})` : ''}
            </Typography>
          )}

          <Typography variant="subtitle2" sx={{ mt: 2 }}>
            Items
          </Typography>
          {order.items.map((li) => (
            <Typography key={li.id} variant="body2" sx={{ mt: 0.5 }}>
              {li.itemName} × {li.quantity} — £{((li.unitPriceMinor * li.quantity) / 100).toFixed(2)}
            </Typography>
          ))}

          {isCancellable(order.status) && (
            <Button variant="outlined" color="warning" sx={{ mt: 2 }} disabled={busy} onClick={() => void onCancel()}>
              Cancel order
            </Button>
          )}
        </Box>
      )}
    </Container>
  );
}
