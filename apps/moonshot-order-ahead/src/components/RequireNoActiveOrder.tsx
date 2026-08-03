import { useEffect, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCafePath } from '../hooks/useCafePath.js';
import { useOrderingGate } from '../hooks/useOrderingGate.js';
import { ACTIVE_ORDER_BLOCK_MESSAGE } from '../lib/order-gate-messages.js';

/**
 * Redirects to the active order's tracking page when the customer already has
 * an in-progress order. Prefer this over per-page checks so deep links stay consistent.
 */
export function RequireNoActiveOrder({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const cafePath = useCafePath();
  const { activeOrder, hasActiveOrder, initialised } = useOrderingGate();

  useEffect(() => {
    if (!initialised || !hasActiveOrder || !activeOrder) return;
    navigate(cafePath(`/orders/${activeOrder.id}`), {
      replace: true,
      state: { snackbar: ACTIVE_ORDER_BLOCK_MESSAGE },
    });
  }, [initialised, hasActiveOrder, activeOrder, navigate, cafePath]);

  if (!initialised || hasActiveOrder) return null;
  return children;
}
