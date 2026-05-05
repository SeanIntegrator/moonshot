import type {
  CreateOrderResponse,
  NormalisedMenu,
  NormalisedMenuItem,
  OrderType,
} from '@moonshot/types';
import {
  Box,
  Button,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../lib/api.js';

function lineTotal(item: NormalisedMenuItem, qty: number): number {
  return item.priceMinor * qty;
}

export function Menu() {
  const [menu, setMenu] = useState<NormalisedMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('takeaway');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [placedOrder, setPlacedOrder] = useState<CreateOrderResponse['order'] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const data = await apiFetch<NormalisedMenu>('/menu');
        setMenu(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load menu');
      }
    })();
  }, []);

  const cartLines = useMemo(() => {
    if (!menu) return [];
    return menu.items
      .map((item) => ({ item, qty: quantities[item.id] ?? 0 }))
      .filter((x) => x.qty > 0);
  }, [menu, quantities]);

  const cartTotalMinor = useMemo(
    () => cartLines.reduce((sum, { item, qty }) => sum + lineTotal(item, qty), 0),
    [cartLines],
  );

  function bumpQty(menuItemId: string, delta: number): void {
    setQuantities((prev) => {
      const current = prev[menuItemId] ?? 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [menuItemId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [menuItemId]: next };
    });
  }

  async function placeOrder(): Promise<void> {
    if (!menu || cartLines.length === 0) return;
    setError(null);
    setSubmitting(true);
    try {
      const data = await apiFetch<CreateOrderResponse>('/orders', {
        method: 'POST',
        body: JSON.stringify({
          customerName: customerName.trim(),
          orderType,
          notes: notes.trim() ? notes.trim() : null,
          items: cartLines.map(({ item, qty }) => ({
            menuItemId: item.id,
            quantity: qty,
          })),
        }),
      });
      setPlacedOrder(data.order);
      setQuantities({});
      setNotes('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Order failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 14 }}>
      <Typography variant="h4" component="h1" sx={{ mt: 0 }}>
        Menu
      </Typography>
      {placedOrder && (
        <Box sx={{ mt: 2, p: 2, borderRadius: 1, bgcolor: 'action.hover' }}>
          <Typography variant="subtitle1" fontWeight={700}>
            Order placed
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            {placedOrder.customerName} — {placedOrder.status} / {placedOrder.paymentStatus}
          </Typography>
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
            Order id: {placedOrder.id}
          </Typography>
          <Button size="small" sx={{ mt: 1 }} onClick={() => setPlacedOrder(null)}>
            Dismiss
          </Button>
        </Box>
      )}
      {error && (
        <Typography color="error" sx={{ mt: 1 }}>
          {error}
        </Typography>
      )}
      {!menu && !error && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Loading…
        </Typography>
      )}
      {menu && (
        <List disablePadding sx={{ mt: 1 }}>
          {menu.items.map((item) => (
            <Fragment key={item.id}>
              <ListItem alignItems="flex-start" disableGutters sx={{ py: 1.5, flexWrap: 'wrap', gap: 1 }}>
                <ListItemText
                  primary={item.name}
                  secondary={item.category.replace(/_/g, ' ')}
                  primaryTypographyProps={{ fontWeight: 600 }}
                  secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  sx={{ flex: '1 1 160px' }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  <Typography variant="body1" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    £{(item.priceMinor / 100).toFixed(2)}
                  </Typography>
                  <Button size="small" variant="outlined" onClick={() => bumpQty(item.id, -1)} disabled={!quantities[item.id]}>
                    −
                  </Button>
                  <Typography sx={{ minWidth: '1.5rem', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {quantities[item.id] ?? 0}
                  </Typography>
                  <Button size="small" variant="contained" onClick={() => bumpQty(item.id, 1)}>
                    +
                  </Button>
                </Box>
              </ListItem>
              <Divider component="li" />
            </Fragment>
          ))}
        </List>
      )}

      <Box
        component="footer"
        sx={{
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          p: 2,
          bgcolor: 'background.paper',
          borderTop: 1,
          borderColor: 'divider',
          maxWidth: 600,
          mx: 'auto',
        }}
      >
        <Typography variant="subtitle2" color="text.secondary">
          Basket
        </Typography>
        {cartLines.length === 0 ? (
          <Typography variant="body2" sx={{ mt: 0.5 }} color="text.secondary">
            Add items to place an order (pay in store).
          </Typography>
        ) : (
          <>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {cartLines.length} line(s) — £{(cartTotalMinor / 100).toFixed(2)}
            </Typography>
            <TextField
              label="Your name"
              fullWidth
              size="small"
              sx={{ mt: 1.5 }}
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
            <Button
              variant="contained"
              fullWidth
              sx={{ mt: 1.5 }}
              disabled={submitting || !customerName.trim()}
              onClick={() => void placeOrder()}
            >
              {submitting ? 'Placing…' : 'Place order'}
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
}
