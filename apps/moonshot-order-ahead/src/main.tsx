import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { getCafeSlug } from './lib/api.js';
import { CafeProvider } from './config/CafeProvider.js';
import { AuthProvider } from './hooks/useAuth.js';
import { CustomerEventsProvider } from './providers/CustomerEventsProvider.js';
import { LoyaltyProvider } from './providers/LoyaltyProvider.js';
import { ReviewNudgeProvider } from './providers/ReviewNudgeProvider.js';
import { MenuProvider } from './providers/MenuProvider.js';
import { ActiveOrdersProvider } from './providers/ActiveOrdersProvider.js';
import { CartProvider } from './providers/CartProvider.js';
import { App } from './App.js';
import { AppErrorBoundary } from './components/AppErrorBoundary.js';
import { useCafeSlugFromRoute } from './hooks/useCafePath.js';
import './index.css';

function CafeAppTree() {
  const cafeSlug = useCafeSlugFromRoute();
  return (
    <CafeProvider>
      <AuthProvider>
        <CustomerEventsProvider>
          <LoyaltyProvider>
            <ReviewNudgeProvider>
              <MenuProvider>
                {/* Remount cart when café slug changes so sessionStorage keys never cross tenants */}
                <CartProvider key={cafeSlug}>
                  <ActiveOrdersProvider>
                    <App />
                  </ActiveOrdersProvider>
                </CartProvider>
              </MenuProvider>
            </ReviewNudgeProvider>
          </LoyaltyProvider>
        </CustomerEventsProvider>
      </AuthProvider>
    </CafeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppErrorBoundary>
        <Routes>
          <Route path="/:cafeSlug/*" element={<CafeAppTree />} />
          <Route path="/" element={<Navigate to={`/${getCafeSlug()}`} replace />} />
          <Route path="*" element={<Navigate to={`/${getCafeSlug()}`} replace />} />
        </Routes>
      </AppErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
);
