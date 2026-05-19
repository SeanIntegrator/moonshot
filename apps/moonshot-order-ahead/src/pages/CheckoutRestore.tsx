import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { restoreOrderFromCheckoutSession } from '../api/orders-api.js';
import { rememberOrderTracking } from '../lib/order-tracking-storage.js';

/**
 * Stripe success URLs should point here (or redirect home with `checkout_session_id`,
 * which forwards from {@link Home}). Reads `checkout_session_id` from the query string.
 */
export function CheckoutRestore() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
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
        navigate(`/orders/${data.order.id}`, { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not restore order');
      }
    })();
  }, [navigate, sessionId]);

  return (
    <Container maxWidth="sm" sx={{ py: 4, pb: 10 }}>
      <Typography variant="h5" component="h1">
        Restoring order…
      </Typography>
      {error ? (
        <Box sx={{ mt: 2 }}>
          <Typography color="error">{error}</Typography>
          <Button sx={{ mt: 2 }} onClick={() => navigate('/', { replace: true })}>
            Home
          </Button>
        </Box>
      ) : (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Hang tight — fetching your order from Stripe checkout.
        </Typography>
      )}
    </Container>
  );
}
