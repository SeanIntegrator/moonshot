import {
  Avatar,
  Box,
  Container,
  Link,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { CurrentOrderCard, OrderNowButton } from '../components/CurrentOrderCard.js';
import { LoyaltyStampCard } from '../components/LoyaltyStampCard.js';
import { OrderingUnavailablePanel } from '../components/OrderingUnavailablePanel.js';
import { QrModal } from '../components/QrModal.js';
import { SectionHead } from '../components/SectionHead.js';
import { UsualSuggestCard } from '../components/UsualSuggestCard.js';
import { HomePageSkeleton } from '../components/skeletons/PageSkeletons.js';
import { PressableCard } from '../components/ui/PressableCard.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { useCafeFeatures } from '../hooks/useCafeFeatures.js';
import { useCafeOpenStatus } from '../hooks/useCafeOpenStatus.js';
import { useOrderingGate } from '../hooks/useOrderingGate.js';
import { useActiveOrders } from '../providers/ActiveOrdersProvider.js';
import { useAuth } from '../hooks/useAuth.js';
import { useLoyalty } from '../hooks/useLoyalty.js';
import { useCafe } from '../hooks/useCafe.js';
import { firstName, formatFromPrice, formatMoney } from '../lib/format.js';
import { featuredItems } from '../lib/menu-utils.js';
import { reorderFromOrder } from '../lib/cart-from-order.js';
import { SIGN_IN_TO_ORDER_MESSAGE } from '../lib/order-gate-messages.js';
import { defaultSelectionsForItem, findWhyNotTryItem } from '../lib/why-not-try.js';
import { MenuItemImage } from '../components/MenuItemImage.js';
import { useCart } from '../providers/CartProvider.js';
import { useMenu } from '../providers/MenuProvider.js';
import { menuItemListPriceMinor } from '../lib/menu-price-utils.js';
import { BOTTOM_NAV_HEIGHT_PX } from '../theme/pageLayout.js';

export function Home() {
  const theme = useTheme();
  const { loading, error, cafe } = useCafe();
  const { orderAheadEnabled, loyaltyEnabled } = useCafeFeatures();
  const { user, membership, isSignedIn } = useAuth();
  const { summary, refresh: refreshLoyalty } = useLoyalty();
  const { caption: openCaption, orderingAvailable, reason: openReason } = useCafeOpenStatus();
  const { canStartNewOrder } = useOrderingGate();
  const { active, recent } = useActiveOrders();
  const { menu } = useMenu();
  const navigate = useNavigate();
  const location = useLocation();
  const cafePath = useCafePath();
  const { upsertLine } = useCart();
  const [qrOpen, setQrOpen] = useState(false);
  const heroStyle = theme.cafeLayout.heroStyle;
  const compactHero = heroStyle === 'compact';
  const showHeroChrome = heroStyle !== 'none';

  function goToOrderOrSignIn(path: '/order' | '/checkout' = '/order') {
    if (!isSignedIn) {
      navigate(cafePath('/profile'), {
        state: { snackbar: SIGN_IN_TO_ORDER_MESSAGE },
      });
      return;
    }
    navigate(cafePath(path));
  }

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

  const showOrderingUnavailable = !activeOrder && !orderingAvailable;

  return (
    <Container
      maxWidth="sm"
      sx={{
        py: 0,
        pb: 10,
        px: 0,
        minHeight: `calc(100dvh - ${BOTTOM_NAV_HEIGHT_PX}px)`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        component="header"
        sx={
          showHeroChrome
            ? (t) => ({
                bgcolor: t.palette.cafe.heroBg,
                color: t.palette.cafe.heroText,
                px: 2,
                pt: compactHero ? 1.5 : 2,
                pb: compactHero ? 1.5 : 3,
              })
            : {
                px: 2,
                pt: 2,
                pb: 1.5,
              }
        }
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography
              variant="caption"
              sx={{
                opacity: showHeroChrome ? 0.75 : 1,
                color: showHeroChrome ? 'inherit' : 'text.secondary',
              }}
            >
              {openCaption}
            </Typography>
            <Typography
              variant={compactHero || !showHeroChrome ? 'h5' : 'h4'}
              component="h1"
              sx={{
                color: showHeroChrome ? 'inherit' : 'text.primary',
                mt: 0.5,
                fontWeight: 700,
              }}
            >
              Hey {name}.
            </Typography>
          </Box>
          {isSignedIn && user && (
            <Avatar
              src={user.avatarUrl ?? undefined}
              alt=""
              sx={
                showHeroChrome
                  ? (t) => ({
                      width: compactHero ? 32 : 36,
                      height: compactHero ? 32 : 36,
                      border: '1.5px solid',
                      borderColor: t.alpha(t.palette.cafe.heroText, 0.3),
                    })
                  : {
                      width: 36,
                      height: 36,
                    }
              }
            >
              {name.charAt(0).toUpperCase()}
            </Avatar>
          )}
        </Box>

        {canShowLiveLoyalty ? (
          <LoyaltyStampCard
            variant={showHeroChrome ? 'hero' : 'card'}
            filled={summary.stamps}
            total={summary.stampsPerReward}
            rewardsAvailable={summary.rewardsAvailable}
            onShowQr={() => setQrOpen(true)}
            onRewardsClick={() => navigate(cafePath('/rewards'))}
          />
        ) : loyaltyEnabled ? (
          <LoyaltyStampCard variant={showHeroChrome ? 'hero' : 'card'} filled={0} total={10} />
        ) : null}

        {activeOrder ? (
          <CurrentOrderCard order={activeOrder} />
        ) : orderingAvailable ? (
          <OrderNowButton onClick={() => goToOrderOrSignIn('/order')} />
        ) : null}
      </Box>

      {showOrderingUnavailable ? (
        <OrderingUnavailablePanel
          orderAheadEnabled={orderAheadEnabled}
          reason={openReason}
          caption={openCaption}
        />
      ) : (
        <Box sx={{ px: 2, pt: 2 }}>
        {orderingAvailable && usualOrder && (
          <UsualSuggestCard
            variant="usual"
            order={usualOrder}
            menu={menu}
            orderingAvailable={canStartNewOrder}
            onOrder={() => {
              if (!isSignedIn) {
                navigate(cafePath('/profile'), {
                  state: { snackbar: SIGN_IN_TO_ORDER_MESSAGE },
                });
                return;
              }
              reorderFromOrder(usualOrder, upsertLine);
              navigate(cafePath('/checkout'));
            }}
          />
        )}
        {orderingAvailable && !usualOrder && whyNotTryItem && (
          <UsualSuggestCard
            variant="whyNotTry"
            item={whyNotTryItem}
            orderingAvailable={canStartNewOrder}
            onOrder={() => {
              if (!isSignedIn) {
                navigate(cafePath('/profile'), {
                  state: { snackbar: SIGN_IN_TO_ORDER_MESSAGE },
                });
                return;
              }
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

        {featured.length > 0 && canStartNewOrder && (
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
                    <Typography variant="body2" sx={{
                      fontWeight: 600
                    }}>
                      {item.name}
                    </Typography>
                    <Typography variant="caption" sx={{
                      color: "text.secondary"
                    }}>
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
      )}

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
