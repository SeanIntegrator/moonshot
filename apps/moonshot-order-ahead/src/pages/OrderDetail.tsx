import type { NormalisedOrder } from '@moonshot/types';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
  Divider,
  Snackbar,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
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
import type { SnackbarLocationState } from '../lib/order-gate-messages.js';
import { getOrderStatusMeta } from '../lib/order-status.js';
import { pageContentWidthSx, toastBottomPx } from '../theme/pageLayout.js';

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
  const location = useLocation();
  const cafePath = useCafePath();
  const { isSignedIn, refresh: refreshAuth } = useAuth();
  const { summary, refresh: refreshLoyalty } = useLoyalty();
  const { refresh: refreshActiveOrders } = useActiveOrders();
  const { menu } = useMenu();
  const [order, setOrder] = useState<NormalisedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as SnackbarLocationState | null;
    if (!state?.snackbar) return;
    setToastMessage(state.snackbar);
    navigate('.', { replace: true, state: null });
  }, [location.state, navigate]);

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

  const { trackingStatus, lastPickupTime } = useOrderTracking(
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
  const readyForPickup = order?.status === 'ready' || allDone;
  // Prefer socket-driven completion so the chip flips before the HTTP reload lands.
  const statusMeta = order
    ? getOrderStatusMeta(allDone ? 'completed' : order.status)
    : null;
  const loyaltyEnabled = summary?.loyaltyEnabled === true;
  const showStampEarned = isSignedIn && loyaltyEnabled && allDone;
  const showStampPending =
    isSignedIn && loyaltyEnabled && order != null && !allDone && order.status !== 'cancelled';
  const canCancel = order != null && isCancellable(order.status) && !allDone;

  // Keep the "7 mins" label fresh while waiting for pickup.
  useEffect(() => {
    if (!pickupTime || readyForPickup) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, [pickupTime, readyForPickup]);

  const minsUntilPickup = useMemo(
    () => (readyForPickup ? null : minutesUntil(pickupTime, nowMs)),
    [readyForPickup, pickupTime, nowMs],
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
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
                  Order #{order.id.slice(0, 8)}
                </Typography>
                <Chip
                  label={statusMeta?.label ?? order.status}
                  size="small"
                  color={statusMeta?.chipColor ?? 'default'}
                />
              </Box>

              {readyForPickup ? (
                <SurfaceCard
                  sx={{
                    mt: 2,
                    p: 1.5,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    borderColor: 'success.main',
                    bgcolor: (t) => alpha(t.palette.success.main, 0.08),
                  }}
                >
                  <CheckCircleOutlineIcon color="success" />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body1" fontWeight={700} color="success.main">
                      Ready for pickup
                    </Typography>
                    {pickupTime && (
                      <Typography variant="caption" color="text.secondary">
                        Pickup time {formatTime(pickupTime)}
                      </Typography>
                    )}
                  </Box>
                </SurfaceCard>
              ) : (
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
              )}

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

              {showStampPending && (
                <SurfaceCard sx={{ mt: 2, p: 1.5 }}>
                  <Typography variant="body2" color="text.secondary">
                    ★ You&apos;ll earn <strong>1 stamp</strong> when the kitchen marks this order complete.
                  </Typography>
                </SurfaceCard>
              )}

              {showStampEarned && (
                <SurfaceCard
                  sx={{
                    mt: 2,
                    p: 1.5,
                    borderColor: 'success.main',
                    bgcolor: (t) => alpha(t.palette.success.main, 0.08),
                  }}
                >
                  <Typography variant="body2" color="success.main" fontWeight={600}>
                    ★ Stamp earned — your loyalty card has been updated.
                  </Typography>
                </SurfaceCard>
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

      <Snackbar
        open={toastMessage != null}
        autoHideDuration={3500}
        onClose={() => setToastMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: toastBottomPx(false), px: 2, ...pageContentWidthSx }}
      >
        <Alert
          severity="info"
          variant="outlined"
          sx={{
            width: '100%',
            alignItems: 'center',
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderColor: 'divider',
            boxShadow: 3,
            '& .MuiAlert-icon': { color: 'info.main' },
          }}
        >
          {toastMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
