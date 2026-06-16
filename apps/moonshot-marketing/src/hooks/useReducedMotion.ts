import { useEffect, useState } from 'react';

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = () => setReduced(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export function getAdminSignupUrl(): string {
  return import.meta.env.VITE_ADMIN_SIGNUP_URL?.trim() || 'http://localhost:5174/signup';
}

export function getAdminLoginUrl(): string {
  return import.meta.env.VITE_ADMIN_LOGIN_URL?.trim() || 'http://localhost:5174/login';
}
