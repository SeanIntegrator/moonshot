import type { NormalisedOrder } from '@moonshot/types';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OrderStatusStepper } from '../components/OrderStatusStepper.js';
import { PageHeader } from '../components/PageHeader.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { cancelCustomerOrder, fetchCustomerOrder } from '../api/orders-api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useOrderTracking } from '../hooks/useOrderTracking.js';
import { readOrderTracking } from '../lib/order-tracking-storage.js';
import { formatMoney, formatTime, modifierSummary } from '../lib/format.js';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Confirmed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Done',
  cancelled: 'Cancelled',
};

const ACTIVE_FLOW = ['pending', 'confirmed', 'preparing', 'ready'] as const;

function isCancellable(status: string): boolean {
  return (ACTIVE_FLOW as readonly string[]).includes(status);
}

export function OrderDetail() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const cafePath = useCafePath();
  const { isSignedIn } = useAuth();
  const [order, setOrder] = useState<NormalisedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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

  const pickupTime = lastPickupTime ?? order?.pickup.pickupTime;
  const allDone = trackingStatus === 'completed' || order?.status === 'completed';

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
    <Container maxWidth="sm" sx={{ py: 2, pb: 10 }}>
      <PageHeader
        title="Your order"
        onBack={() => navigate(cafePath('/'))}
        right={<InfoOutlinedIcon fontSize="small" color="action" />}
      />

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
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
                Order #{order.id.slice(0, 8)}
              </Typography>
              <Typography variant="h6" fontWeight={700} sx={{ mt: 0.5 }}>
                {allDone ? 'Done' : 'In progress'}
              </Typography>
            </Box>
            <Chip
              label={STATUS_LABEL[order.status] ?? order.status}
              size="small"
              color={order.status === 'ready' ? 'success' : 'primary'}
            />
          </Box>

          <OrderStatusStepper stepIndex={stepIndex} completed={allDone} />

          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            We&apos;ll update this when the kitchen marks your order ready.
          </Typography>

          <Box
            sx={{
              mt: 2,
              p: 1.5,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.25,
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
            }}
          >
            <AccessTimeIcon color="action" />
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Pickup time
              </Typography>
              <Typography variant="body1" fontWeight={700}>
                {formatTime(pickupTime)}
              </Typography>
            </Box>
            {/* Wireframe: reschedule not implemented */}
            <Typography variant="body2" color="text.disabled">
              Change ›
            </Typography>
          </Box>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 3, letterSpacing: 0.5, display: 'block' }}>
            Items · {order.items.length}
          </Typography>
          {order.items.map((li) => (
            <Box key={li.id} sx={{ display: 'flex', gap: 1.5, py: 1.25, alignItems: 'center' }}>
              <Box sx={{ width: 56, height: 56, borderRadius: 1, bgcolor: 'action.hover', flexShrink: 0 }} />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {li.itemName}
                </Typography>
                {li.modifiers.length > 0 && (
                  <Typography variant="caption" color="text.secondary">
                    {modifierSummary(li.modifiers)}
                  </Typography>
                )}
              </Box>
              <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                {formatMoney(li.unitPriceMinor * li.quantity, order.currency)}
              </Typography>
            </Box>
          ))}

          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography fontWeight={700}>Total paid</Typography>
            <Typography fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatMoney(order.totalMinor, order.currency)}
            </Typography>
          </Box>

          {trackingStatus === 'connecting' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Connecting for live updates…
            </Typography>
          )}
          {trackingStatus === 'error' && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Tracking unavailable — we&apos;ll call your name when it&apos;s ready.
            </Typography>
          )}
          {allDone && (
            <Typography variant="body2" fontWeight={600} color="success.main" sx={{ mt: 1 }}>
              Your order is ready!
              {completedAt ? ` (${formatTime(completedAt)})` : ''}
            </Typography>
          )}

          {isCancellable(order.status) && (
            <>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                sx={{ mt: 3 }}
                disabled={busy}
                onClick={() => void onCancel()}
              >
                Cancel order
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                You can cancel free of charge before the kitchen starts your order.
              </Typography>
            </>
          )}
        </Box>
      )}
    </Container>
  );
}
