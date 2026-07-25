import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { GoogleOneTap } from './components/auth/GoogleOneTap.js';
import { RequireAuth } from './components/RequireAuth.js';
import { RequireFeature } from './components/RequireFeature.js';
import { useAuth } from './hooks/useAuth.js';
import { useCafePath } from './hooks/useCafePath.js';
import { useCafeFeatures } from './hooks/useCafeFeatures.js';
import { useCafeOpenStatus } from './hooks/useCafeOpenStatus.js';
import { SIGN_IN_TO_ORDER_MESSAGE } from './lib/sign-in-to-order.js';
import { PageTransition } from './page-transition/index.js';
import { Checkout } from './pages/Checkout.js';
import { CheckoutRestore } from './pages/CheckoutRestore.js';
import { Home } from './pages/Home.js';
import { ItemDetail } from './pages/ItemDetail.js';
import { Menu } from './pages/Menu.js';
import { OrderConfirmed } from './pages/OrderConfirmed.js';
import { OrderDetail } from './pages/OrderDetail.js';
import { Profile } from './pages/Profile.js';
import { Rewards } from './pages/Rewards.js';

function pathToNavValue(pathname: string): number {
  const segments = pathname.split('/').filter(Boolean);
  const tail = segments.slice(1).join('/');
  if (tail.startsWith('profile')) return 3;
  if (tail.startsWith('rewards')) return 2;
  if (
    tail.startsWith('order') ||
    tail.startsWith('checkout') ||
    tail.startsWith('orders/')
  ) {
    return 1;
  }
  return 0;
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const cafePath = useCafePath();
  const { loyaltyEnabled } = useCafeFeatures();
  const { orderingAvailable } = useCafeOpenStatus();
  const { isSignedIn } = useAuth();
  const navValue = pathToNavValue(location.pathname);

  const hideNav =
    /\/checkout/.test(location.pathname) ||
    /\/order\/item\//.test(location.pathname) ||
    /\/orders\//.test(location.pathname);

  return (
    <>
      <GoogleOneTap />
      {/* Tab bar stays outside so only page content cross-fades */}
      <PageTransition>
        {(loc) => (
          <Routes location={loc}>
            <Route path="/" element={<Home />} />
            <Route
              path="/order"
              element={
                <RequireFeature feature="orderAhead">
                  <RequireAuth>
                    <Menu />
                  </RequireAuth>
                </RequireFeature>
              }
            />
            <Route
              path="/order/item/:menuItemId"
              element={
                <RequireFeature feature="orderAhead">
                  <RequireAuth>
                    <ItemDetail />
                  </RequireAuth>
                </RequireFeature>
              }
            />
            <Route
              path="/checkout"
              element={
                <RequireFeature feature="orderAhead">
                  <RequireAuth>
                    <Checkout />
                  </RequireAuth>
                </RequireFeature>
              }
            />
            <Route path="/checkout/restore" element={<CheckoutRestore />} />
            <Route path="/orders/:orderId" element={<OrderDetail />} />
            <Route path="/orders/:orderId/confirmed" element={<OrderConfirmed />} />
            <Route
              path="/rewards"
              element={
                <RequireFeature feature="loyalty">
                  <Rewards />
                </RequireFeature>
              }
            />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        )}
      </PageTransition>
      {!hideNav && (
        <Paper
          component="nav"
          square
          elevation={3}
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: (t) => t.zIndex.appBar,
            borderTop: 1,
            borderColor: 'divider',
            borderRadius: 0,
            maxWidth: 600,
            mx: 'auto',
          }}
        >
          <BottomNavigation
            showLabels
            value={navValue}
            onChange={(_, v) => {
              if (v === 0) navigate(cafePath('/'));
              else if (v === 1) {
                if (!orderingAvailable) return;
                if (!isSignedIn) {
                  navigate(cafePath('/profile'), {
                    state: { snackbar: SIGN_IN_TO_ORDER_MESSAGE },
                  });
                  return;
                }
                navigate(cafePath('/order'));
              } else if (v === 2) {
                if (!loyaltyEnabled) return;
                navigate(cafePath('/rewards'));
              } else navigate(cafePath('/profile'));
            }}
          >
            <BottomNavigationAction label="Home" icon={<HomeOutlinedIcon />} />
            <BottomNavigationAction
              label="Order"
              icon={<LocalCafeOutlinedIcon />}
              disabled={!orderingAvailable}
              sx={{ opacity: orderingAvailable ? 1 : 0.4 }}
            />
            <BottomNavigationAction
              label="Rewards"
              icon={<CardGiftcardOutlinedIcon />}
              disabled={!loyaltyEnabled}
              sx={{ opacity: loyaltyEnabled ? 1 : 0.4 }}
            />
            <BottomNavigationAction label="You" icon={<PersonOutlinedIcon />} />
          </BottomNavigation>
        </Paper>
      )}
    </>
  );
}
