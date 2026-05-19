import { API_VERSION_PREFIX } from '@moonshot/types';
import { Box, Container, Link, List, ListItem, ListItemButton, ListItemText, Typography } from '@mui/material';
import { useEffect } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useActiveOrders } from '../providers/ActiveOrdersProvider.js';
import { useCafe } from '../hooks/useCafe.js';

export function Home() {
  const { loading, error, cafe } = useCafe();
  const { active, loading: ordersLoading } = useActiveOrders();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('checkout_session_id')?.trim();
    if (!sessionId) return;
    navigate(`/checkout/restore?checkout_session_id=${encodeURIComponent(sessionId)}`, {
      replace: true,
    });
  }, [navigate]);

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, pb: 8 }}>
        <Typography color="text.secondary">Loading café…</Typography>
      </Container>
    );
  }

  if (error || !cafe) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, pb: 8 }}>
        <Typography color="error">{error ?? 'Café unavailable'}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Check VITE_API_URL and VITE_CAFE_SLUG. API: <code>{API_VERSION_PREFIX}</code>
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 8 }}>
      <Box
        component="header"
        sx={(theme) => ({
          bgcolor: theme.palette.cafe.heroBg,
          color: theme.palette.cafe.heroText,
          mx: -2,
          px: 2,
          py: 3,
          mb: 2,
        })}
      >
        <Typography variant="h4" component="h1" sx={{ color: 'inherit', m: 0 }}>
          {cafe.name}
        </Typography>
        <Typography sx={{ mt: 1, opacity: 0.9, color: 'inherit' }}>
          Order ahead · {cafe.slug}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Theme: <code>{cafe.themeId}</code> · POS: <code>{cafe.posProvider}</code>
      </Typography>

      {ordersLoading && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Loading your orders…
        </Typography>
      )}
      {!ordersLoading && active.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
            In progress
          </Typography>
          <List dense disablePadding>
            {active.map((o) => (
              <ListItem key={o.id} disablePadding>
                <ListItemButton component={RouterLink} to={`/orders/${o.id}`}>
                  <ListItemText
                    primary={`${o.customerName} · ${o.status}`}
                    secondary={`£${(o.totalMinor / 100).toFixed(2)}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      <Link component={RouterLink} to="/order" underline="hover" fontWeight={600}>
        Browse menu
      </Link>
    </Container>
  );
}
