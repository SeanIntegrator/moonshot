import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { NormalisedOrder } from '@moonshot/types';
import { Box, Button, Container, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchCustomerOrder } from '../api/orders-api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { readOrderTracking } from '../lib/order-tracking-storage.js';
import { firstName, formatTime } from '../lib/format.js';

export function OrderConfirmed() {
  const { orderId = '' } = useParams();
  const navigate = useNavigate();
  const cafePath = useCafePath();
  const { user, isSignedIn } = useAuth();
  const [order, setOrder] = useState<NormalisedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const guestTracking = !isSignedIn ? readOrderTracking(orderId.trim()) : null;

  useEffect(() => {
    if (!orderId.trim()) return;
    void (async () => {
      try {
        const data = await fetchCustomerOrder(orderId.trim(), guestTracking);
        setOrder(data.order);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load order');
      }
    })();
  }, [orderId, guestTracking, isSignedIn]);

  const name = firstName(user?.displayName, user?.email);

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Container
        maxWidth="sm"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          py: 4,
          pb: 3,
        }}
      >
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Order confirmed
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 320, mx: 'auto' }}>
            Thanks {isSignedIn ? name : 'there'} — we&apos;ve got your order. We&apos;ll let you know when it&apos;s ready.
          </Typography>

          {order?.pickup.pickupTime && (
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                mb: 3,
              }}
            >
              <AccessTimeIcon fontSize="small" color="action" />
              <Typography variant="body2" color="text.secondary">
                Pickup at{' '}
                <Typography component="span" variant="body2" fontWeight={700} color="text.primary">
                  {formatTime(order.pickup.pickupTime)}
                </Typography>
              </Typography>
            </Box>
          )}

          {error && <Typography color="error">{error}</Typography>}

          {isSignedIn && (
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25, p: 1.5, textAlign: 'left', mb: 3 }}>
              <Typography variant="body2" color="success.main">
                ★ You&apos;ll earn <strong>1 stamp</strong> with this order.
              </Typography>
            </Box>
          )}
        </Box>

        <Button
          variant="contained"
          fullWidth
          sx={{ py: 1.5, flexShrink: 0 }}
          onClick={() => navigate(cafePath('/'))}
        >
          Back to home
        </Button>
      </Container>
    </Box>
  );
}
