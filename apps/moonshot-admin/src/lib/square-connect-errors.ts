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
