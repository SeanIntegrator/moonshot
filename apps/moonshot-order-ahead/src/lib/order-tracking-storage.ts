const PREFIX = 'moonshot_order_track_v1_';

/** Guest checkout: persist tracking JWT for HTTP + socket until the session ends. */
export function rememberOrderTracking(orderId: string, trackingToken: string | undefined): void {
  if (!trackingToken?.trim()) return;
  try {
    sessionStorage.setItem(PREFIX + orderId, trackingToken.trim());
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function readOrderTracking(orderId: string): string | undefined {
  try {
    return sessionStorage.getItem(PREFIX + orderId) ?? undefined;
  } catch {
    return undefined;
  }
}
