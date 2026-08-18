import { Box, CircularProgress } from '@mui/material';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { AdminShell } from './console/AdminShell.js';
import { CafeProvider } from './console/CafeProvider.js';
import { BrandPage } from './console/pages/BrandPage.js';
import { HoursPage } from './console/pages/HoursPage.js';
import { KitchenPage } from './console/pages/KitchenPage.js';
import { MenuPage } from './console/pages/MenuPage.js';
import { OrderAheadPage } from './console/pages/OrderAheadPage.js';
import { OverviewPage } from './console/pages/OverviewPage.js';
import { ReportsPage } from './console/pages/ReportsPage.js';
import { StockPage } from './console/pages/StockPage.js';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { LoginPage } from './pages/LoginPage.js';
import { OnboardingPosImportPage } from './pages/OnboardingPosImportPage.js';
import { OnboardingWizard } from './pages/OnboardingWizard.js';
import { SignupPage } from './pages/SignupPage.js';

/** Keep query string (e.g. `?stripeConnect=return`) across onboarding redirects. */
function OnboardingRedirect() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/onboarding', search }} replace />;
}

/** Preserve search so Stripe Connect return still lands on Overview. */
function SignedInHome() {
  const { search } = useLocation();
  return <Navigate to={{ pathname: '/overview', search }} replace />;
}

function RequireSignedIn() {
  const { session, onboardingStatus } = useAuth();
  if (!session) return <Navigate to="/login" replace />;
  if (onboardingStatus && !onboardingStatus.completed) return <OnboardingRedirect />;
  return <Outlet />;
}

function ConsoleLayout() {
  return (
    <CafeProvider>
      <AdminShell />
    </CafeProvider>
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
          bgcolor: 'background.default',
        }}
      >
        <CircularProgress color="primary" />
      </Box>
    );
  }

  const needsOnboarding = session && onboardingStatus && !onboardingStatus.completed;

  return (
    <Routes>
      <Route
        path="/login"
        element={session ? (needsOnboarding ? <OnboardingRedirect /> : <SignedInHome />) : <LoginPage />}
      />
      <Route
        path="/signup"
        element={session ? (needsOnboarding ? <OnboardingRedirect /> : <SignedInHome />) : <SignupPage />}
      />
      <Route
        path="/onboarding/import-pos"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : needsOnboarding ? (
            <OnboardingPosImportPage />
          ) : (
            <SignedInHome />
          )
        }
      />
      <Route
        path="/onboarding"
        element={
          !session ? (
            <Navigate to="/login" replace />
          ) : needsOnboarding ? (
            <OnboardingWizard />
          ) : (
            <SignedInHome />
          )
        }
      />
      <Route element={<RequireSignedIn />}>
        <Route path="/" element={<SignedInHome />} />
        <Route element={<ConsoleLayout />}>
          <Route path="overview" element={<OverviewPage />} />
          <Route path="stock" element={<StockPage />} />
          <Route path="menu" element={<MenuPage />} />
          <Route path="hours" element={<HoursPage />} />
          <Route path="order-ahead" element={<OrderAheadPage />} />
          <Route path="kitchen" element={<KitchenPage />} />
          <Route path="brand" element={<BrandPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>
      </Route>
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
