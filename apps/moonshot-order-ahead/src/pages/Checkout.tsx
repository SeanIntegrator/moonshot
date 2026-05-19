import type {
  NormalisedMenu,
  NormalisedMenuItem,
  OrderLineModifierSelectionInput,
  OrderType,
  PickupEstimateResponse,
} from '@moonshot/types';
import {
  Box,
  Button,
  Container,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { createCustomerOrder, fetchPickupEstimate } from '../api/orders-api.js';
import { apiFetch } from '../lib/api.js';
import { rememberOrderTracking } from '../lib/order-tracking-storage.js';
import { useCart } from '../providers/CartProvider.js';

function estimateLineMinor(
  item: NormalisedMenuItem,
  modifiers: OrderLineModifierSelectionInput[],
): number {
  let total = item.priceMinor;
  for (const sel of modifiers) {
    const g = item.modifierGroups.find((x) => x.id === sel.groupId);
    const opt = g?.options.find((o) => o.id === sel.optionId);
    if (opt) total += opt.priceMinor;
  }
  return total;
}

export function Checkout() {
  const navigate = useNavigate();
  const { lines, clear } = useCart();
  const [menu, setMenu] = useState<NormalisedMenu | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('takeaway');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<PickupEstimateResponse | null>(null);

  useEffect(() => {
    if (lines.length === 0) navigate('/order', { replace: true });
  }, [lines.length, navigate]);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<NormalisedMenu>('/menu');
        setMenu(data);
      } catch {
        setMenu(null);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const est = await fetchPickupEstimate();
        setEstimate(est);
      } catch {
        setEstimate(null);
      }
    })();
  }, []);

  const pricedLines = useMemo(() => {
    if (!menu) return [];
    return lines.map((line) => {
      const item = menu.items.find((i) => i.id === line.menuItemId);
      const unit = item ? estimateLineMinor(item, line.modifiers) : null;
      return { line, item, unit };
    });
  }, [menu, lines]);

  const cartTotalMinor = useMemo(
    () =>
      pricedLines.reduce((sum, row) => {
        if (row.unit == null) return sum;
        return sum + row.unit * row.line.quantity;
      }, 0),
    [pricedLines],
  );

  async function placeOrder(): Promise<void> {
    if (lines.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      const data = await createCustomerOrder({
        customerName: customerName.trim(),
        orderType,
        notes: notes.trim() ? notes.trim() : null,
        items: lines.map((l) => ({
          menuItemId: l.menuItemId,
          quantity: l.quantity,
          modifiers: l.modifiers.length ? l.modifiers : undefined,
          allergens: l.allergens.length ? l.allergens : undefined,
        })),
      });
      rememberOrderTracking(data.order.id, data.trackingToken);
      if (data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      clear();
      navigate(`/orders/${data.order.id}`, { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 12 }}>
      <Typography variant="h4" component="h1">
        Checkout
      </Typography>
      <Button component={RouterLink} to="/order" size="small" sx={{ mt: 1 }}>
        Edit basket
      </Button>

      {estimate && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Estimated pickup around{' '}
          <strong>
            {new Date(estimate.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </strong>{' '}
          (~{estimate.minutesFromNow} min). Live ETA updates after you order.
        </Typography>
      )}

      <Typography variant="subtitle2" sx={{ mt: 3 }}>
        Order summary
      </Typography>
      {pricedLines.map(({ line, item, unit }) => (
        <Typography key={line.key} variant="body2" sx={{ mt: 0.5 }}>
          {item?.name ?? line.menuItemId} × {line.quantity}
          {unit != null ? ` — £${((unit * line.quantity) / 100).toFixed(2)}` : ' — price from server'}
        </Typography>
      ))}
      <Typography variant="body1" fontWeight={700} sx={{ mt: 1 }}>
        Estimated total £{(cartTotalMinor / 100).toFixed(2)}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="p">
        Final total is confirmed server-side from the menu (modifiers included).
      </Typography>

      {error && (
        <Typography color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
      )}

      <TextField
        label="Your name"
        fullWidth
        size="small"
        sx={{ mt: 2 }}
        value={customerName}
        onChange={(e) => setCustomerName(e.target.value)}
        required
      />
      <TextField
        select
        label="Order type"
        fullWidth
        size="small"
        sx={{ mt: 1.5 }}
        value={orderType}
        onChange={(e) => setOrderType(e.target.value as OrderType)}
      >
        <MenuItem value="takeaway">Takeaway</MenuItem>
        <MenuItem value="eat_in">Eat in</MenuItem>
      </TextField>
      <TextField
        label="Notes (optional)"
        fullWidth
        size="small"
        sx={{ mt: 1.5 }}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <Box sx={{ mt: 3 }}>
        <Button
          variant="contained"
          fullWidth
          disabled={submitting || !customerName.trim()}
          onClick={() => void placeOrder()}
        >
          {submitting ? 'Placing…' : 'Place order'}
        </Button>
      </Box>
    </Container>
  );
}
