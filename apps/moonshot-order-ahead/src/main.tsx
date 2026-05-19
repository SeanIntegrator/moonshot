import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CafeProvider } from './config/CafeProvider.js';
import { AuthProvider } from './hooks/useAuth.js';
import { ActiveOrdersProvider } from './providers/ActiveOrdersProvider.js';
import { CartProvider } from './providers/CartProvider.js';
import { App } from './App.js';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CafeProvider>
      <AuthProvider>
        <CartProvider>
          <ActiveOrdersProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </ActiveOrdersProvider>
        </CartProvider>
      </AuthProvider>
    </CafeProvider>
  </StrictMode>,
);
