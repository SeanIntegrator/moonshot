/** Map Square OAuth return `reason` query values to seller-friendly copy. */
export function squareConnectErrorMessage(
  reason: string,
  extras?: { otherCafe?: string | null },
): string {
  switch (reason) {
    case 'access_denied':
      return 'Square authorization was cancelled. You can try again when ready.';
    case 'invalid_state':
      return 'This Square link expired or was invalid. Go back and connect again.';
    case 'missing_code':
      return 'Square did not return an authorization code. Try connecting again.';
    case 'token_incomplete':
      return 'Square returned an incomplete authorization. Try connecting again.';
    case 'exchange_failed':
      return 'Could not complete Square authorization. Check your connection and try again.';
    case 'merchant_in_use': {
      const other = extras?.otherCafe?.trim();
      return other
        ? `This Square account is already connected to ${other}. Disconnect it there first, or sign in with a different Square seller.`
        : 'This Square account is already connected to another café. Disconnect it there first, or sign in with a different Square seller.';
    }
    default:
      return 'Square connection failed. Go back and try again.';
  }
}

/** Square OAuth return query on Overview (toast) or import-pos (alert). */
export function hasSquareConnectQuery(search: string): boolean {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  return new URLSearchParams(raw).has('squareConnect');
}

export function squareConnectNoticeFromSearch(
  search: string,
): { severity: 'error' | 'success'; message: string } | null {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  const outcome = params.get('squareConnect');
  if (!outcome) return null;
  if (outcome === 'error') {
    return {
      severity: 'error',
      message: squareConnectErrorMessage(params.get('reason') ?? 'unknown', {
        otherCafe: params.get('otherCafe'),
      }),
    };
  }
  if (outcome === 'connected') {
    return { severity: 'success', message: 'Square connected.' };
  }
  return null;
}

export function stripSquareConnectSearchParams(search: string): string {
  const raw = search.startsWith('?') ? search.slice(1) : search;
  const params = new URLSearchParams(raw);
  params.delete('squareConnect');
  params.delete('reason');
  params.delete('otherCafe');
  return params.toString();
}
