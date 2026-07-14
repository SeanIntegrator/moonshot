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

/**
 * Classify transport-level failures. Do not use `navigator.onLine` here —
 * browsers report it incorrectly on weak/captive networks, which falsely
 * turns API/config errors into a full-screen "offline" state.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof ConnectivityError) return true;
  if (error instanceof TypeError && messageLooksLikeNetworkFailure(error.message)) return true;
  if (error instanceof Error && error.name === 'ConnectivityError') return true;
  if (error instanceof Error && messageLooksLikeNetworkFailure(error.message)) return true;
  return false;
}

/** Transient failures worth retrying before showing an error UI. */
export function isRetriableBootstrapError(error: unknown): boolean {
  if (isAbortError(error)) return false;
  return isNetworkError(error);
}

export function isAbortError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  return false;
}

export function toUserFacingError(error: unknown, fallback = 'Something went wrong'): string {
  if (isAbortError(error)) return fallback;
  if (isNetworkError(error)) return CONNECTIVITY_ERROR_MESSAGE;
  if (error instanceof Error) return error.message;
  return fallback;
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal?.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
