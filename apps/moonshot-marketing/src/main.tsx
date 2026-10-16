import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Shared styles load first, so each component's own styles can override them.
import './theme.css';
import { App } from './App.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
