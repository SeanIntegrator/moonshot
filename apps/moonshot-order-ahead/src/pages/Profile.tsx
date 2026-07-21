import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import {
  Avatar,
  Box,
  Button,
  Container,
  Divider,
  Link,
  Typography,
} from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { ProfileStatCard } from '../components/ProfileStatCard.js';
import { SectionHead } from '../components/SectionHead.js';
import { SignedOutPanel } from '../components/SignedOutPanel.js';
import { useAuth } from '../hooks/useAuth.js';
import { useActiveOrders } from '../providers/ActiveOrdersProvider.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { formatMoney, formatShortDate } from '../lib/format.js';
import { reorderFromOrder } from '../lib/cart-from-order.js';
import { useCart } from '../providers/CartProvider.js';

export function Profile() {
  const { user, membership, loading, signOut, isSignedIn } = useAuth();
  const { recent } = useActiveOrders();
  const cafePath = useCafePath();
  const navigate = useNavigate();
  const { upsertLine } = useCart();

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 10 }}>
      {loading && (
        <Typography color="text.secondary">Checking session…</Typography>
      )}

      {!loading && !isSignedIn && <SignedOutPanel onContinueGuest={() => navigate(cafePath('/order'))} />}

      {!loading && isSignedIn && user && (
        <>
          <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25, p: 2, mb: 2 }}>
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
          </Box>

          <SectionHead eyebrow="Account" title="Your details" />
          <Box
            sx={{
              border: 1,
              borderColor: 'divider',
              borderRadius: 1.25,
              overflow: 'hidden',
              mb: 3,
              bgcolor: 'background.paper',
            }}
          >
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
          </Box>

          {recent.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <SectionHead
                eyebrow="Activity"
                title="Recent orders"
                action={
                  <Link component={RouterLink} to={cafePath('/order')} variant="body2" underline="hover">
                    See all
                  </Link>
                }
              />
              {recent.slice(0, 3).map((o) => (
                <Box
                  key={o.id}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1.5,
                    py: 1.25,
                    borderBottom: 1,
                    borderColor: 'divider',
                  }}
                >
                  <Box sx={{ width: 40, height: 40, borderRadius: 1, bgcolor: 'action.hover', flexShrink: 0 }} />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {o.items.map((i) => i.itemName).join(' + ')}
                    </Typography>
                    <Link
                      component="button"
                      variant="caption"
                      color="text.secondary"
                      underline="hover"
                      onClick={() => {
                        reorderFromOrder(o, upsertLine);
                        navigate(cafePath('/checkout'));
                      }}
                    >
                      Reorder →
                    </Link>
                  </Box>
                  <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
                    {formatMoney(o.totalMinor, o.currency)}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}

          <Button variant="outlined" color="error" fullWidth onClick={() => signOut()}>
            Sign out
          </Button>
        </>
      )}
    </Container>
  );
}
