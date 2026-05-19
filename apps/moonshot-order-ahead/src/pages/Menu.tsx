import type { NormalisedMenu, NormalisedMenuItem } from '@moonshot/types';
import {
  Box,
  Button,
  Container,
  Divider,
  Link,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { apiFetch } from '../lib/api.js';
import { useCart } from '../providers/CartProvider.js';

function lineTotal(item: NormalisedMenuItem, qty: number): number {
  return item.priceMinor * qty;
}

function simpleLineQty(lines: ReturnType<typeof useCart>['lines'], menuItemId: string): number {
  const hit = lines.find((l) => l.menuItemId === menuItemId && l.modifiers.length === 0);
  return hit?.quantity ?? 0;
}

export function Menu() {
  const [menu, setMenu] = useState<NormalisedMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { lines, bumpSimpleQuantity } = useCart();

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
      .map((item) => ({ item, qty: simpleLineQty(lines, item.id) }))
      .filter((x) => x.qty > 0);
  }, [menu, lines]);

  const cartTotalMinor = useMemo(
    () => cartLines.reduce((sum, { item, qty }) => sum + lineTotal(item, qty), 0),
    [cartLines],
  );

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 14 }}>
      <Typography variant="h4" component="h1" sx={{ mt: 0 }}>
        Order
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Tap + for a quick add with defaults, or open an item title to choose modifiers and allergens.
      </Typography>
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
                  primary={
                    <Link component={RouterLink} to={`/order/item/${item.id}`} underline="hover" fontWeight={600}>
                      {item.name}
                    </Link>
                  }
                  secondary={`${item.category.replace(/_/g, ' ')}${item.subcategory ? ` · ${item.subcategory}` : ''}`}
                  secondaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                  sx={{ flex: '1 1 160px' }}
                />
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                  <Typography variant="body1" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    £{(item.priceMinor / 100).toFixed(2)}
                  </Typography>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => bumpSimpleQuantity(item.id, -1)}
                    disabled={simpleLineQty(lines, item.id) === 0}
                  >
                    −
                  </Button>
                  <Typography sx={{ minWidth: '1.5rem', textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
                    {simpleLineQty(lines, item.id)}
                  </Typography>
                  <Button size="small" variant="contained" onClick={() => bumpSimpleQuantity(item.id, 1)}>
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
            Add items, then continue to checkout.
          </Typography>
        ) : (
          <>
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {cartLines.length} line(s) — £{(cartTotalMinor / 100).toFixed(2)}{' '}
              <Typography component="span" variant="caption" color="text.secondary">
                (detailed lines may include modifiers)
              </Typography>
            </Typography>
            <Button component={RouterLink} to="/checkout" variant="contained" fullWidth sx={{ mt: 1.5 }}>
              Checkout
            </Button>
          </>
        )}
      </Box>
    </Container>
  );
}
