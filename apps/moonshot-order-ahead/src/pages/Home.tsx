import {
  Avatar,
  Box,
  Button,
  Container,
  Link,
  Typography,
} from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { CurrentOrderCard, OrderNowButton } from '../components/CurrentOrderCard.js';
import { LoyaltyStampCard } from '../components/LoyaltyStampCard.js';
import { QrModal } from '../components/QrModal.js';
import { SectionHead } from '../components/SectionHead.js';
import { HomePageSkeleton } from '../components/skeletons/PageSkeletons.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { useCafeFeatures } from '../hooks/useCafeFeatures.js';
import { useActiveOrders } from '../providers/ActiveOrdersProvider.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLoyalty } from '../hooks/useLoyalty.js';
import { useCafe } from '../hooks/useCafe.js';
import { firstName, formatFromPrice, formatMoney, timeGreeting } from '../lib/format.js';
import { featuredItems } from '../lib/menu-utils.js';
import { reorderFromOrder } from '../lib/cart-from-order.js';
import { MenuItemImage } from '../components/MenuItemImage.js';
import { useCart } from '../providers/CartProvider.js';
import { useMenu } from '../providers/MenuProvider.js';
import { menuItemListPriceMinor } from '../lib/menu-price-utils.js';
import { cafeOpenStatus } from '@moonshot/types';

export function Home() {
  const { loading, error, cafe } = useCafe();
  const { orderAheadEnabled, loyaltyEnabled } = useCafeFeatures();
  const { user, membership, isSignedIn } = useAuth();
  const { summary, refresh: refreshLoyalty } = useLoyalty();
  const { active, recent } = useActiveOrders();
  const { menu } = useMenu();
  const navigate = useNavigate();
  const location = useLocation();
  const cafePath = useCafePath();
  const { upsertLine } = useCart();
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('checkout_session_id')?.trim();
    if (!sessionId) return;
    navigate(
      `${cafePath('/checkout/restore')}?checkout_session_id=${encodeURIComponent(sessionId)}`,
      { replace: true },
    );
  }, [navigate, cafePath]);

  useEffect(() => {
    if (isSignedIn && loyaltyEnabled) void refreshLoyalty();
  }, [location.pathname, isSignedIn, loyaltyEnabled, refreshLoyalty]);

  const usualOrder = recent[0] ?? null;
  const featured = useMemo(() => (menu ? featuredItems(menu) : []), [menu]);
  const activeOrder = active[0] ?? null;
  const greeting = timeGreeting();
  const name = isSignedIn ? firstName(user?.displayName, user?.email) : 'there';
  const canShowLiveLoyalty = isSignedIn && loyaltyEnabled && summary?.loyaltyEnabled && membership;
  const openStatus = useMemo(
    () => cafeOpenStatus(cafe?.hours, cafe?.timezone ?? 'UTC'),
    [cafe?.hours, cafe?.timezone],
  );
  const orderingAvailable = orderAheadEnabled && openStatus.isOpen;

  if (loading) {
    return <HomePageSkeleton />;
  }

  if (error || !cafe) {
    // CafeProvider normally handles bootstrap failures; this is a safety net.
    return (
      <Container maxWidth="sm" sx={{ py: 2, pb: 8 }}>
        <Typography color="error">{error ?? 'Café unavailable'}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 0, pb: 10, px: 0 }}>
      <Box
        component="header"
        sx={(theme) => ({
          bgcolor: theme.palette.cafe.heroBg,
          color: theme.palette.cafe.heroText,
          px: 2,
          pt: 2,
          pb: 3,
        })}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.75, color: 'inherit' }}>
              {openStatus.caption}
            </Typography>
            <Typography variant="h4" component="h1" sx={{ color: 'inherit', mt: 0.5, fontWeight: 700 }}>
              {greeting}, {name}.
            </Typography>
          </Box>
          {isSignedIn && user && (
            <Avatar
              src={user.avatarUrl ?? undefined}
              alt=""
              sx={{ width: 36, height: 36, border: '1.5px solid', borderColor: 'rgba(255,255,255,0.3)' }}
            >
              {name.charAt(0).toUpperCase()}
            </Avatar>
          )}
        </Box>

        {canShowLiveLoyalty ? (
          <LoyaltyStampCard
            variant="hero"
            filled={summary.stamps}
            total={summary.stampsPerReward}
            rewardsAvailable={summary.rewardsAvailable}
            onShowQr={() => setQrOpen(true)}
          />
        ) : loyaltyEnabled ? (
          <LoyaltyStampCard variant="hero" filled={0} total={10} />
        ) : null}

        {activeOrder ? (
          <CurrentOrderCard order={activeOrder} />
        ) : orderingAvailable ? (
          <OrderNowButton onClick={() => navigate(cafePath('/order'))} />
        ) : (
          <Typography variant="body2" sx={{ mt: 2, opacity: 0.85 }}>
            {!orderAheadEnabled
              ? 'Online ordering is not available for this café right now.'
              : `${openStatus.caption}. Online ordering will be back when the café is open.`}
          </Typography>
        )}
      </Box>

      <Box sx={{ px: 2, pt: 2 }}>
        {usualOrder && orderingAvailable && (
          <Box sx={{ mb: 3 }}>
            <SectionHead title="Your usual" />
            <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1.25, p: 1.5 }}>
              {usualOrder.items.map((li) => {
                const menuItem = li.menuItemId
                  ? menu?.items?.find((i) => i.id === li.menuItemId)
                  : undefined;
                return (
                <Box key={li.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1.25 }}>
                  <MenuItemImage
                    src={menuItem?.imageUrl}
                    alt={li.itemName}
                    width={48}
                    height={48}
                    borderRadius={1}
                    loading="lazy"
                  />
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {li.itemName}
                    </Typography>
                    {li.modifiers.length > 0 && (
                      <Typography variant="caption" color="text.secondary">
                        {li.modifiers.map((m) => m.optionName).join(' · ')}
                      </Typography>
                    )}
                  </Box>
                </Box>
                );
              })}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1.5 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Total
                  </Typography>
                  <Typography variant="body1" fontWeight={700}>
                    {formatMoney(usualOrder.totalMinor, usualOrder.currency)}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  disabled={!orderingAvailable}
                  onClick={() => {
                    if (!orderingAvailable) return;
                    reorderFromOrder(usualOrder, upsertLine);
                    navigate(cafePath('/checkout'));
                  }}
                  sx={{ minWidth: 140 }}
                >
                  Order →
                </Button>
              </Box>
            </Box>
          </Box>
        )}

        {featured.length > 0 && orderingAvailable && (
          <Box sx={{ mb: 2, minHeight: 200 }}>
            <SectionHead
              eyebrow="Featured"
              title="On the menu"
              action={
                <Link component={RouterLink} to={cafePath('/order')} underline="hover" variant="body2">
                  See all →
                </Link>
              }
            />
            <Box sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, scrollbarWidth: 'none' }}>
              {featured.map((item) => (
                <Box
                  key={item.id}
                  component={RouterLink}
                  to={cafePath(`/order/item/${item.id}`)}
                  className="pressable-card"
                  sx={{
                    flexShrink: 0,
                    width: 180,
                    textDecoration: 'none',
                    color: 'inherit',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1.25,
                    overflow: 'hidden',
                  }}
                >
                  <MenuItemImage
                    src={item.imageUrl}
                    alt={item.name}
                    height={100}
                    borderRadius={0}
                    loading={featured.indexOf(item) === 0 ? 'eager' : 'lazy'}
                    fetchPriority={featured.indexOf(item) === 0 ? 'high' : 'auto'}
                  />
                  <Box sx={{ p: 1.25 }}>
                    <Typography variant="body2" fontWeight={600}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.sizes?.length
                        ? formatFromPrice(menuItemListPriceMinor(item), item.currency)
                        : formatMoney(menuItemListPriceMinor(item), item.currency)}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>

      {isSignedIn && membership && (
        <QrModal
          open={qrOpen}
          onClose={() => setQrOpen(false)}
          displayId={membership.loyaltyDisplayId}
          name={user?.displayName ?? undefined}
          stamps={summary?.stamps}
          stampsPerReward={summary?.stampsPerReward}
        />
      )}
    </Container>
  );
}
