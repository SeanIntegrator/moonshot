import type { CafeOpenReason } from '@moonshot/types';

export function orderingUnavailableCopy(params: {
  orderAheadEnabled: boolean;
  reason: CafeOpenReason;
  caption: string;
}): { title: string; body: string } {
  if (!params.orderAheadEnabled) {
    return {
      title: 'Online ordering unavailable',
      body: 'Online ordering is not available for this café right now.',
    };
  }
  if (params.reason === 'paused') {
    return {
      title: 'Back shortly',
      body: params.caption,
    };
  }
  return {
    title: params.caption,
    body: 'Online ordering will be back when the café is open.',
  };
}
