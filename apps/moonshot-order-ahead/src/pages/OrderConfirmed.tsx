import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import type { NormalisedOrder } from '@moonshot/types';
import { Box, Button, Chip, Container, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchCustomerOrder } from '../api/orders-api.js';
import { useAuth } from '../hooks/useAuth.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { readOrderTracking } from '../lib/order-tracking-storage.js';
import { firstName, formatMoney, formatTime } from '../lib/format.js';

function totalItemQuantity(items: NormalisedOrder['items']): number {
  return items.reduce((sum, li) => sum + li.quantity, 0);
}

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
    <Container maxWidth="sm" sx={{ py: 4, pb: 10, textAlign: 'center' }}>
      <CheckCircleIcon sx={{ fontSize: 56, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Order confirmed
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 320, mx: 'auto' }}>
        Thanks {isSignedIn ? name : 'there'} — we&apos;ve got your order. We&apos;ll let you know when it&apos;s ready.
      </Typography>

      {error && <Typography color="error">{error}</Typography>}

      {order && (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25, p: 2, textAlign: 'left', mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Order #{order.id.slice(0, 8)}
            </Typography>
            <Chip label="Confirmed" size="small" color="primary" />
          </Box>
          <Typography variant="body1" fontWeight={700}>
            {formatMoney(order.totalMinor, order.currency)} · {totalItemQuantity(order.items)} item
            {totalItemQuantity(order.items) !== 1 ? 's' : ''}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <AccessTimeIcon fontSize="small" color="action" />
              <Typography variant="body2">Pickup at</Typography>
            </Box>
            <Typography variant="body2" fontWeight={700}>
              {formatTime(order.pickup.pickupTime)}
            </Typography>
          </Box>
        </Box>
      )}

      {isSignedIn && (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25, p: 1.5, textAlign: 'left', mb: 3 }}>
          <Typography variant="body2" color="success.main">
            ★ You&apos;ll earn <strong>1 stamp</strong> when the kitchen marks your order complete.
          </Typography>
        </Box>
      )}

      <Button
        variant="contained"
        fullWidth
        sx={{ mb: 1.5 }}
        onClick={() => navigate(cafePath(`/orders/${orderId}`))}
      >
        Track order →
      </Button>
      <Button variant="outlined" fullWidth onClick={() => navigate(cafePath('/'))}>
        Back to home
      </Button>

      {user?.email && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>
          A receipt has been emailed to {user.email}.
        </Typography>
      )}
    </Container>
  );
}
