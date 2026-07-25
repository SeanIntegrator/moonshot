import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { SIGN_IN_TO_ORDER_MESSAGE } from '../lib/sign-in-to-order.js';

/**
 * Redirects to profile with a snackbar when the customer is signed out.
 * Prefer this over per-page guards so deep links into order/checkout stay consistent.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const cafePath = useCafePath();
  const { loading, isSignedIn } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isSignedIn) {
      navigate(cafePath('/profile'), {
        replace: true,
        state: { snackbar: SIGN_IN_TO_ORDER_MESSAGE },
      });
    }
  }, [loading, isSignedIn, navigate, cafePath]);

  if (loading || !isSignedIn) return null;
  return children;
}
