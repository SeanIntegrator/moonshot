import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import CardGiftcardOutlinedIcon from '@mui/icons-material/CardGiftcardOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { BottomNavigation, BottomNavigationAction, Paper } from '@mui/material';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { GoogleOneTap } from './components/auth/GoogleOneTap.js';
import { useCafePath } from './hooks/useCafePath.js';
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
  const navValue = pathToNavValue(location.pathname);

  const hideNav =
    /\/checkout/.test(location.pathname) ||
    /\/order\/item\//.test(location.pathname) ||
    /\/orders\//.test(location.pathname);

  return (
    <>
      <GoogleOneTap />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/order" element={<Menu />} />
        <Route path="/order/item/:menuItemId" element={<ItemDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/checkout/restore" element={<CheckoutRestore />} />
        <Route path="/orders/:orderId" element={<OrderDetail />} />
        <Route path="/orders/:orderId/confirmed" element={<OrderConfirmed />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
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
              else if (v === 1) navigate(cafePath('/order'));
              else if (v === 2) navigate(cafePath('/rewards'));
              else navigate(cafePath('/profile'));
            }}
          >
            <BottomNavigationAction label="Home" icon={<HomeOutlinedIcon />} />
            <BottomNavigationAction label="Order" icon={<LocalCafeOutlinedIcon />} />
            <BottomNavigationAction label="Rewards" icon={<CardGiftcardOutlinedIcon />} />
            <BottomNavigationAction label="You" icon={<PersonOutlinedIcon />} />
          </BottomNavigation>
        </Paper>
      )}
    </>
  );
}
