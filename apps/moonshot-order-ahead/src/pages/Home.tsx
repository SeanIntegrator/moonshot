import {
  Avatar,
  Box,
  Container,
  Link,
  Typography,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { CurrentOrderCard, OrderNowButton } from '../components/CurrentOrderCard.js';
import { LoyaltyStampCard } from '../components/LoyaltyStampCard.js';
import { QrModal } from '../components/QrModal.js';
import { SectionHead } from '../components/SectionHead.js';
import { UsualSuggestCard } from '../components/UsualSuggestCard.js';
import { HomePageSkeleton } from '../components/skeletons/PageSkeletons.js';
import { PressableCard } from '../components/ui/PressableCard.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { useCafeFeatures } from '../hooks/useCafeFeatures.js';
import { useCafeOpenStatus } from '../hooks/useCafeOpenStatus.js';
import { useActiveOrders } from '../providers/ActiveOrdersProvider.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLoyalty } from '../hooks/useLoyalty.js';
import { useCafe } from '../hooks/useCafe.js';
import { firstName, formatFromPrice, formatMoney, timeGreeting } from '../lib/format.js';
import { featuredItems } from '../lib/menu-utils.js';
import { reorderFromOrder } from '../lib/cart-from-order.js';
import { defaultSelectionsForItem, findWhyNotTryItem } from '../lib/why-not-try.js';
import { MenuItemImage } from '../components/MenuItemImage.js';
import { useCart } from '../providers/CartProvider.js';
import { useMenu } from '../providers/MenuProvider.js';
import { menuItemListPriceMinor } from '../lib/menu-price-utils.js';

export function Home() {
  const { loading, error, cafe } = useCafe();
  const { orderAheadEnabled, loyaltyEnabled } = useCafeFeatures();
  const { user, membership, isSignedIn } = useAuth();
  const { summary, refresh: refreshLoyalty } = useLoyalty();
  const { caption: openCaption, orderingAvailable } = useCafeOpenStatus();
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
  const whyNotTryItem = useMemo(
    () => (usualOrder ? null : findWhyNotTryItem(menu)),
    [usualOrder, menu],
  );
  const featured = useMemo(() => (menu ? featuredItems(menu) : []), [menu]);
  const activeOrder = active[0] ?? null;
  const greeting = timeGreeting();
  const name = isSignedIn ? firstName(user?.displayName, user?.email) : 'there';
  const canShowLiveLoyalty = isSignedIn && loyaltyEnabled && summary?.loyaltyEnabled && membership;

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
              {openCaption}
            </Typography>
            <Typography variant="h4" component="h1" sx={{ color: 'inherit', mt: 0.5, fontWeight: 700 }}>
              {greeting}, {name}.
            </Typography>
          </Box>
          {isSignedIn && user && (
            <Avatar
              src={user.avatarUrl ?? undefined}
              alt=""
              sx={(theme) => ({
                width: 36,
                height: 36,
                border: '1.5px solid',
                borderColor: alpha(theme.palette.cafe.heroText, 0.3),
              })}
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
            onRewardsClick={() => navigate(cafePath('/rewards'))}
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
              : `${openCaption}. Online ordering will be back when the café is open.`}
          </Typography>
        )}
      </Box>

      <Box sx={{ px: 2, pt: 2 }}>
        {orderingAvailable && usualOrder && (
          <UsualSuggestCard
            variant="usual"
            order={usualOrder}
            menu={menu}
            orderingAvailable={orderingAvailable}
            onOrder={() => {
              reorderFromOrder(usualOrder, upsertLine);
              navigate(cafePath('/checkout'));
            }}
          />
        )}
        {orderingAvailable && !usualOrder && whyNotTryItem && (
          <UsualSuggestCard
            variant="whyNotTry"
            item={whyNotTryItem}
            orderingAvailable={orderingAvailable}
            onOrder={() => {
              const { sizeId, modifiers } = defaultSelectionsForItem(whyNotTryItem);
              upsertLine({
                menuItemId: whyNotTryItem.id,
                sizeId,
                quantity: 1,
                modifiers,
                allergens: [],
              });
              navigate(cafePath('/checkout'));
            }}
          />
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
                <PressableCard
                  key={item.id}
                  component={RouterLink}
                  to={cafePath(`/order/item/${item.id}`)}
                  sx={{
                    flexShrink: 0,
                    width: 180,
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
                </PressableCard>
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
