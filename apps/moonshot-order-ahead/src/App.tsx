import { BottomNavigation, BottomNavigationAction, Box, Paper } from '@mui/material';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { GoogleOneTap } from './components/auth/GoogleOneTap.js';
import { Checkout } from './pages/Checkout.js';
import { CheckoutRestore } from './pages/CheckoutRestore.js';
import { Home } from './pages/Home.js';
import { ItemDetail } from './pages/ItemDetail.js';
import { Menu } from './pages/Menu.js';
import { OrderDetail } from './pages/OrderDetail.js';
import { Profile } from './pages/Profile.js';
import { Rewards } from './pages/Rewards.js';

function pathToNavValue(pathname: string): number {
  if (pathname.startsWith('/profile')) return 3;
  if (pathname.startsWith('/rewards')) return 2;
  if (
    pathname.startsWith('/order') ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/orders/')
  ) {
    return 1;
  }
  return 0;
}

function NavIcon({ children }: { children: string }) {
  return (
    <Box component="span" aria-hidden sx={{ fontSize: '1.25rem', lineHeight: 1 }}>
      {children}
    </Box>
  );
}

export function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const navValue = pathToNavValue(location.pathname);

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
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
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
        }}
      >
        <BottomNavigation
          showLabels
          value={navValue}
          onChange={(_, v) => {
            if (v === 0) navigate('/');
            else if (v === 1) navigate('/order');
            else if (v === 2) navigate('/rewards');
            else navigate('/profile');
          }}
        >
          <BottomNavigationAction label="Home" icon={<NavIcon>⌂</NavIcon>} />
          <BottomNavigationAction label="Order" icon={<NavIcon>☰</NavIcon>} />
          <BottomNavigationAction label="Rewards" icon={<NavIcon>★</NavIcon>} />
          <BottomNavigationAction label="Profile" icon={<NavIcon>◉</NavIcon>} />
        </BottomNavigation>
      </Paper>
    </>
  );
}
