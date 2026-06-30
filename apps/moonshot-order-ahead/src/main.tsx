import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { getCafeSlug } from './lib/api.js';
import { CafeProvider } from './config/CafeProvider.js';
import { AuthProvider } from './hooks/useAuth.js';
import { LoyaltyProvider } from './providers/LoyaltyProvider.js';
import { ActiveOrdersProvider } from './providers/ActiveOrdersProvider.js';
import { CartProvider } from './providers/CartProvider.js';
import { App } from './App.js';
import './index.css';

function CafeAppTree() {
  return (
    <CafeProvider>
      <AuthProvider>
        <LoyaltyProvider>
          <CartProvider>
            <ActiveOrdersProvider>
              <App />
            </ActiveOrdersProvider>
          </CartProvider>
        </LoyaltyProvider>
      </AuthProvider>
    </CafeProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/:cafeSlug/*" element={<CafeAppTree />} />
        <Route path="/" element={<Navigate to={`/${getCafeSlug()}`} replace />} />
        <Route path="*" element={<Navigate to={`/${getCafeSlug()}`} replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
