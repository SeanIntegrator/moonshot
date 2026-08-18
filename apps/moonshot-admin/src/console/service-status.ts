import { formatTime24 } from '../lib/format.js';

export type ServiceStatusKind = 'taking_orders' | 'paused' | 'closed';

export type ServiceStatus = {
  kind: ServiceStatusKind;
  label: string;
};

/**
 * Header / Hours / Overview pill. Pause wins while `pausedUntil` is in the
 * future; otherwise hours (plus last-order buffer) decide open vs closed.
 */
export function resolveServiceStatus(params: {
  isOpen: boolean;
  timeZone: string;
  pausedUntil?: string | null;
  now?: Date;
}): ServiceStatus {
  const now = params.now ?? new Date();
  if (params.pausedUntil) {
    const until = new Date(params.pausedUntil);
    if (!Number.isNaN(until.getTime()) && until.getTime() > now.getTime()) {
      return {
        kind: 'paused',
        label: `Paused until ${formatTime24(until, params.timeZone)}`,
      };
    }
  }
  if (params.isOpen) {
    return { kind: 'taking_orders', label: 'Taking orders' };
  }
  return { kind: 'closed', label: 'Closed' };
}
