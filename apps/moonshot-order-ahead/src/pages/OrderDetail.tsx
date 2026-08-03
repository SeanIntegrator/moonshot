import type { NormalisedOrder } from '@moonshot/types';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import {
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { OrderStatusStepper } from '../components/OrderStatusStepper.js';
import { PageHeader } from '../components/PageHeader.js';
import { MenuItemImage } from '../components/MenuItemImage.js';
import { SurfaceCard } from '../components/ui/SurfaceCard.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { cancelCustomerOrder, fetchCustomerOrder } from '../api/orders-api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLoyalty } from '../hooks/useLoyalty.js';
import { useActiveOrders } from '../providers/ActiveOrdersProvider.js';
import { useMenu } from '../providers/MenuProvider.js';
import { useOrderTracking } from '../hooks/useOrderTracking.js';
import { readOrderTracking } from '../lib/order-tracking-storage.js';
import {
  formatMinutesLabel,
  formatMoney,
  formatTime,
  minutesUntil,
  modifierSummary,
} from '../lib/format.js';
import { getOrderStatusMeta } from '../lib/order-status.js';

const ACTIVE_FLOW = ['pending', 'confirmed', 'preparing', 'ready'] as const;

function isCancellable(status: string): boolean {
  return (ACTIVE_FLOW as readonly string[]).includes(status);
}

function totalItemQuantity(items: NormalisedOrder['items']): number {
  return items.reduce((sum, li) => sum + li.quantity, 0);
}

export function OrderDetail() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const cafePath = useCafePath();
  const { isSignedIn, refresh: refreshAuth } = useAuth();
  const { summary, refresh: refreshLoyalty } = useLoyalty();
  const { refresh: refreshActiveOrders } = useActiveOrders();
  const { menu } = useMenu();
  const [order, setOrder] = useState<NormalisedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

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

  const handleOrderCompleted = useCallback(() => {
    if (!isSignedIn) return;
    void refreshLoyalty();
    void refreshAuth();
    void refreshActiveOrders();
  }, [isSignedIn, refreshLoyalty, refreshAuth, refreshActiveOrders]);

  const { trackingStatus, completedAt, stepIndex, lastPickupTime } = useOrderTracking(
    order?.id ?? null,
    order?.status,
    guestTracking ?? null,
    { onOrderCompleted: handleOrderCompleted, onSyncNeeded: reload },
  );

  // Always poll while active — socket is the fast path; HTTP catches missed events.
  useEffect(() => {
    if (!order || !(ACTIVE_FLOW as readonly string[]).includes(order.status)) return;
    const id = window.setInterval(() => void reload(), 5_000);
    return () => window.clearInterval(id);
  }, [order?.id, order?.status, reload]);

  // Poll catch-up: refresh loyalty when HTTP discovers completion without a socket event.
  const prevStatusRef = useRef<string | undefined>(undefined);
  useEffect(() => {
    const prev = prevStatusRef.current;
    prevStatusRef.current = order?.status;
    if (order?.status === 'completed' && prev != null && prev !== 'completed') {
      handleOrderCompleted();
    }
  }, [order?.status, handleOrderCompleted]);

  const pickupTime = lastPickupTime ?? order?.pickup.pickupTime;
  const allDone = trackingStatus === 'completed' || order?.status === 'completed';
  // Prefer socket-driven completion so the chip flips before the HTTP reload lands.
  const statusMeta = order
    ? getOrderStatusMeta(allDone ? 'completed' : order.status)
    : null;
  const loyaltyEnabled = summary?.loyaltyEnabled === true;
  const showStampEarned = isSignedIn && loyaltyEnabled && allDone;
  const showStampPending =
    isSignedIn && loyaltyEnabled && order != null && !allDone && order.status !== 'cancelled';
  const canCancel = order != null && isCancellable(order.status);

  // Keep the "7 mins" label fresh while the order is still active.
  useEffect(() => {
    if (!pickupTime || allDone) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [pickupTime, allDone]);

  const minsUntilPickup = useMemo(
    () => (allDone ? null : minutesUntil(pickupTime, nowMs)),
    [allDone, pickupTime, nowMs],
  );

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
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      <Container
        maxWidth="sm"
        sx={{ flex: 1, display: 'flex', flexDirection: 'column', py: 2, pb: canCancel ? 2 : 10 }}
      >
        <PageHeader title="Your order" onBack={() => navigate(cafePath('/'))} />

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
          <>
            <Box sx={{ flex: 1 }}>
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
                  label={statusMeta?.label ?? order.status}
                  size="small"
                  color={statusMeta?.chipColor ?? 'default'}
                />
              </Box>

              <OrderStatusStepper stepIndex={stepIndex} completed={allDone} />

              <SurfaceCard
                sx={{
                  mt: 2,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                }}
              >
                <AccessTimeIcon color="action" />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="caption" color="text.secondary">
                    Pickup time
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {formatTime(pickupTime)}
                  </Typography>
                </Box>
                {minsUntilPickup != null && (
                  <Typography
                    variant="body1"
                    fontWeight={700}
                    color="text.secondary"
                    sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
                  >
                    {formatMinutesLabel(minsUntilPickup)}
                  </Typography>
                )}
              </SurfaceCard>

              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 3, letterSpacing: 0.5, display: 'block' }}
              >
                Items · {totalItemQuantity(order.items)}
              </Typography>
              {order.items.map((li) => {
                const menuItem = li.menuItemId
                  ? menu?.items?.find((i) => i.id === li.menuItemId)
                  : undefined;
                return (
                  <Box key={li.id} sx={{ display: 'flex', gap: 1.5, py: 1.25, alignItems: 'center' }}>
                    <MenuItemImage
                      src={menuItem?.imageUrl}
                      alt={li.itemName}
                      width={56}
                      height={56}
                      borderRadius={1}
                      loading="lazy"
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="body2" fontWeight={600}>
                        {li.quantity > 1 ? `${li.quantity}× ${li.itemName}` : li.itemName}
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
                );
              })}

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

              {showStampPending && (
                <SurfaceCard sx={{ mt: 2, p: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    ★ You&apos;ll earn <strong>1 stamp</strong> when the kitchen marks this order complete.
                  </Typography>
                </SurfaceCard>
              )}

              {showStampEarned && (
                <Box
                  sx={{
                    mt: 2,
                    p: 1.5,
                    border: 1,
                    borderColor: 'success.light',
                    borderRadius: 1.25,
                    bgcolor: 'success.50',
                  }}
                >
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    ★ Stamp earned — your loyalty card has been updated.
                  </Typography>
                </Box>
              )}
            </Box>

            {canCancel && (
              <Box sx={{ pt: 2, flexShrink: 0 }}>
                <Button
                  variant="contained"
                  color="error"
                  fullWidth
                  sx={{ py: 1.5, minHeight: 48 }}
                  disabled={busy}
                  onClick={() => void onCancel()}
                >
                  Cancel order
                </Button>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: 'block', mt: 1, textAlign: 'center' }}
                >
                  You can cancel free of charge before the kitchen starts your order.
                </Typography>
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
