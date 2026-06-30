import { Box, Button, CircularProgress, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCafePath } from '../hooks/useCafePath.js';
import { restoreOrderFromCheckoutSession } from '../api/orders-api.js';
import { rememberOrderTracking } from '../lib/order-tracking-storage.js';

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
  const [error, setError] = useState<string | null>(null);
  const sessionId = params.get('checkout_session_id')?.trim();
  const ran = useRef(false);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing checkout_session_id');
      return;
    }
    if (ran.current) return;
    ran.current = true;

    void (async () => {
      try {
        const data = await restoreOrderFromCheckoutSession(sessionId);
        rememberOrderTracking(data.order.id, data.trackingToken);
        navigate(cafePath(`/orders/${data.order.id}/confirmed`), { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not restore order');
      }
    })();
  }, [navigate, sessionId, cafePath]);

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
        Redirecting…
      </Typography>
    </Box>
  );
}
