import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import type { NormalisedOrder } from '@moonshot/types';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Snackbar,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProfileStatCard } from '../components/ProfileStatCard.js';
import { RecentOrdersSection } from '../components/RecentOrdersSection.js';
import { SectionHead } from '../components/SectionHead.js';
import { SignedOutPanel } from '../components/SignedOutPanel.js';
import { SurfaceCard } from '../components/ui/SurfaceCard.js';
import { useAuth } from '../hooks/useAuth.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { useOrderingGate } from '../hooks/useOrderingGate.js';
import { reorderFromOrder } from '../lib/cart-from-order.js';
import { formatShortDate } from '../lib/format.js';
import type { SnackbarLocationState } from '../lib/order-gate-messages.js';
import { useActiveOrders } from '../providers/ActiveOrdersProvider.js';
import { useCart } from '../providers/CartProvider.js';
import { pageContentWidthSx, toastBottomPx } from '../theme/pageLayout.js';

export function Profile() {
  const { user, membership, loading, signOut, isSignedIn } = useAuth();
  const { recent } = useActiveOrders();
  const cafePath = useCafePath();
  const navigate = useNavigate();
  const location = useLocation();
  const { upsertLine } = useCart();
  const { canStartNewOrder } = useOrderingGate();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const state = location.state as SnackbarLocationState | null;
    if (!state?.snackbar) return;
    setToastMessage(state.snackbar);
    navigate('.', { replace: true, state: null });
  }, [location.state, navigate]);

  const handleReorder = (order: NormalisedOrder) => {
    if (!canStartNewOrder) return;
    reorderFromOrder(order, upsertLine);
    navigate(cafePath('/checkout'));
  };

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 10 }}>
      {loading && (
        <Typography color="text.secondary">Checking session…</Typography>
      )}

      {!loading && !isSignedIn && <SignedOutPanel />}

      {!loading && isSignedIn && user && (
        <>
          <SurfaceCard sx={{ p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <Avatar src={user.avatarUrl ?? undefined} sx={{ width: 56, height: 56 }}>
                {(user.displayName ?? user.email).charAt(0).toUpperCase()}
              </Avatar>
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight={700}>
                  {user.displayName ?? user.email}
                </Typography>
                {membership && (
                  <Typography variant="caption" color="text.secondary">
                    Member since {formatShortDate(membership.firstVisit)}
                  </Typography>
                )}
              </Box>
            </Box>
            {membership && (
              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                <ProfileStatCard value={membership.totalOrders} label="Orders" />
                <ProfileStatCard value={membership.freeDrinksRedeemed ?? 0} label="Free drinks" />
                <ProfileStatCard value={membership.loyaltyCardProgress} label="Stamps" />
              </Box>
            )}
          </SurfaceCard>

          <SectionHead eyebrow="Account" title="Your details" />
          <SurfaceCard sx={{ overflow: 'hidden', mb: 3 }}>
            {(
              [
                ['Name', user.displayName ?? '—'],
                ['Email', user.email],
              ] as const
            ).map(([label, value], i, arr) => (
              <Box key={label}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    px: 1.5,
                    py: 1.25,
                  }}
                >
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
                    {label}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="body2" color="text.secondary">
                      {value}
                    </Typography>
                    <ChevronRightIcon fontSize="small" color="disabled" />
                  </Box>
                </Box>
                {i < arr.length - 1 && <Divider />}
              </Box>
            ))}
          </SurfaceCard>

          <RecentOrdersSection
            orders={recent}
            orderingAvailable={canStartNewOrder}
            onReorder={handleReorder}
          />

          <Button variant="contained" color="error" fullWidth onClick={() => signOut()}>
            Sign out
          </Button>
        </>
      )}

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
    </Container>
  );
}
