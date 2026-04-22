import { BottomNavigation, BottomNavigationAction, Box, Paper } from '@mui/material';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { GoogleOneTap } from './components/auth/GoogleOneTap.js';
import { Home } from './pages/Home.js';
import { Menu } from './pages/Menu.js';
import { Profile } from './pages/Profile.js';

function pathToNavValue(pathname: string): number {
  if (pathname.startsWith('/menu')) return 1;
  if (pathname.startsWith('/profile')) return 2;
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
        <Route path="/menu" element={<Menu />} />
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
            else if (v === 1) navigate('/menu');
            else navigate('/profile');
          }}
        >
          <BottomNavigationAction label="Home" icon={<NavIcon>⌂</NavIcon>} />
          <BottomNavigationAction label="Menu" icon={<NavIcon>☰</NavIcon>} />
          <BottomNavigationAction label="Profile" icon={<NavIcon>◉</NavIcon>} />
        </BottomNavigation>
      </Paper>
    </>
  );
}
