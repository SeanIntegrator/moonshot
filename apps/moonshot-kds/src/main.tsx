import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerInstallServiceWorker } from '@moonshot/web-runtime/pwa';
import { App } from './App.js';

registerInstallServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
