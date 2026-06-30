export const CONNECTIVITY_ERROR_MESSAGE =
  'Please check your internet connection and try again';

/** Thrown when fetch fails due to connectivity (offline, DNS, timeout at transport layer). */
export class ConnectivityError extends Error {
  constructor(message = CONNECTIVITY_ERROR_MESSAGE) {
    super(message);
    this.name = 'ConnectivityError';
  }
}

function messageLooksLikeNetworkFailure(message: string): boolean {
  const msg = message.toLowerCase();
  return (
    msg.includes('failed to fetch') ||
    msg.includes('networkerror') ||
    msg.includes('network request failed') ||
    msg.includes('load failed') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('err_network_changed') ||
    msg.includes('internet connection')
  );
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof ConnectivityError) return true;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  if (error instanceof TypeError && messageLooksLikeNetworkFailure(error.message)) return true;
  if (error instanceof Error && messageLooksLikeNetworkFailure(error.message)) return true;
  return false;
}

export function toUserFacingError(error: unknown, fallback = 'Something went wrong'): string {
  if (isNetworkError(error)) return CONNECTIVITY_ERROR_MESSAGE;
  if (error instanceof Error) return error.message;
  return fallback;
}
