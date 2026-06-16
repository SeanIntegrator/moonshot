import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Toolbar,
  Typography,
} from '@mui/material';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { LoginPage } from './pages/LoginPage.js';
import { OnboardingWizard } from './pages/OnboardingWizard.js';
import { SignupPage } from './pages/SignupPage.js';

function ProtectedDashboard() {
  const { session, logout } = useAuth();
  if (!session) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Moonshot Admin
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {session.adminUser.email} · {session.cafe.name}
          </Typography>
          <Button color="inherit" onClick={logout}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>
        <DashboardPage session={session} />
      </Container>
    </Box>
  );
}

function AppRoutes() {
  const { session, onboardingStatus, loading } = useAuth();

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          bgcolor: '#0a0a0b',
        }}
      >
        <CircularProgress sx={{ color: '#e8ff47' }} />
      </Box>
    );
  }

  const needsOnboarding = session && onboardingStatus && !onboardingStatus.completed;

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? <Navigate to={needsOnboarding ? '/onboarding' : '/'} replace /> : <LoginPage />}
      />
      <Route
        path="/signup"
        element={session ? <Navigate to={needsOnboarding ? '/onboarding' : '/'} replace /> : <SignupPage />}
      />
      <Route
        path="/onboarding"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : needsOnboarding ? (
            <OnboardingWizard />
          ) : (
            <Navigate to="/" replace />
          )
        }
      />
      <Route
        path="/"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : needsOnboarding ? (
            <Navigate to="/onboarding" replace />
          ) : (
            <ProtectedDashboard />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
