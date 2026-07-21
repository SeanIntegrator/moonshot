import type { CreateOrderResponse } from '@moonshot/types';
import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCafePath } from '../hooks/useCafePath.js';
import { restoreOrderFromCheckoutSession } from '../api/orders-api.js';
import { rememberOrderTracking } from '../lib/order-tracking-storage.js';
import { useCart } from '../providers/CartProvider.js';

/**
 * StrictMode remounts share one in-flight promise per sessionId.
 * Cleared in `finally` so a later visit to the same success URL can retry.
 */
const restoreBySession = new Map<string, Promise<CreateOrderResponse>>();

/**
 * Stripe success URLs should point here (or redirect home with `checkout_session_id`,
 * which forwards from {@link Home}). Reads `checkout_session_id` from the query string.
 *
 * Depends on CafeProvider setting X-Cafe-Slug synchronously — see docs/stripe-checkout-return.md.
 */
export function CheckoutRestore() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const cafePath = useCafePath();
  const { clear } = useCart();
  const [error, setError] = useState<string | null>(null);
  const sessionId = params.get('checkout_session_id')?.trim();

  useEffect(() => {
    if (!sessionId) {
      setError('Missing checkout_session_id');
      return;
    }

    let pending = restoreBySession.get(sessionId);
    if (!pending) {
      pending = restoreOrderFromCheckoutSession(sessionId).finally(() => {
        restoreBySession.delete(sessionId);
      });
      restoreBySession.set(sessionId, pending);
    }

    void pending
      .then((data) => {
        rememberOrderTracking(data.order.id, data.trackingToken);
        clear();
        navigate(cafePath(`/orders/${data.order.id}/confirmed`), { replace: true });
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'Could not restore order');
      });
  }, [navigate, sessionId, cafePath, clear]);

  if (error) {
    return (
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
        }}
      >
        <Typography color="error" sx={{ mb: 2, textAlign: 'center' }}>
          {error}
        </Typography>
        <Button onClick={() => navigate(cafePath('/'), { replace: true })}>Home</Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
      }}
    >
      <CircularProgress size={32} />
      <Typography variant="body2" color="text.secondary">
        Confirming your payment…
      </Typography>
    </Box>
  );
}
