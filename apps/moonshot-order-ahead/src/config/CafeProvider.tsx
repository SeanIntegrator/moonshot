import { CssBaseline, ThemeProvider } from '@mui/material';
import type { Cafe, FeatureFlagKey } from '@moonshot/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CafeTheme } from '@moonshot/types';
import { CafeLoadError } from '../components/CafeLoadError.js';
import { useCafeSlugFromRoute } from '../hooks/useCafePath.js';
import { apiFetch, setRuntimeCafeSlug } from '../lib/api.js';
import {
  isAbortError,
  isNetworkError,
  isRetriableBootstrapError,
  sleep,
  toUserFacingError,
} from '../lib/network-error.js';
import { createCafeMuiTheme } from '../theme/createCafeMuiTheme.js';
import { getTheme } from '../themes/index.js';

/** Retries absorb brief blips / cold starts before we show an error screen. */
const BOOTSTRAP_ATTEMPTS = 3;
const BOOTSTRAP_RETRY_DELAYS_MS = [400, 1200] as const;

export type CafeContextValue = {
  loading: boolean;
  error: string | null;
  /** Last failure looked like a transport/network issue (after retries). */
  isConnectivityError: boolean;
  cafe: Cafe | null;
  theme: CafeTheme | null;
  activeFeatures: FeatureFlagKey[];
  retry: () => void;
};

const CafeContext = createContext<CafeContextValue | null>(null);

export function CafeProvider({ children }: { children: ReactNode }) {
  const slug = useCafeSlugFromRoute();
  // Sync before child effects (e.g. CheckoutRestore) so X-Cafe-Slug matches the URL slug.
  setRuntimeCafeSlug(slug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnectivityError, setIsConnectivityError] = useState(false);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [theme, setTheme] = useState<CafeTheme | null>(null);
  const [activeFeatures, setActiveFeatures] = useState<FeatureFlagKey[]>([]);
  const [retryNonce, setRetryNonce] = useState(0);

  const retry = useCallback(() => {
    setRetryNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setIsConnectivityError(false);

    void (async () => {
      let lastError: unknown;

      for (let attempt = 0; attempt < BOOTSTRAP_ATTEMPTS; attempt++) {
        if (controller.signal.aborted) return;

        try {
          const data = await apiFetch<{ cafe: Cafe; activeFeatures: FeatureFlagKey[] }>(
            `/cafe/${encodeURIComponent(slug)}`,
            { signal: controller.signal },
          );
          if (controller.signal.aborted) return;

          const c = data.cafe;
          setCafe(c);
          setActiveFeatures(data.activeFeatures);
          setTheme(getTheme(c.themeId, c.themeOverrides));
          setError(null);
          setIsConnectivityError(false);
          setLoading(false);
          return;
        } catch (e) {
          if (isAbortError(e) || controller.signal.aborted) return;
          lastError = e;

          const canRetry =
            isRetriableBootstrapError(e) && attempt < BOOTSTRAP_ATTEMPTS - 1;
          if (!canRetry) break;

          try {
            await sleep(BOOTSTRAP_RETRY_DELAYS_MS[attempt] ?? 1200, controller.signal);
          } catch {
            return;
          }
        }
      }

      if (controller.signal.aborted) return;

      setCafe(null);
      setTheme(null);
      setActiveFeatures([]);
      setIsConnectivityError(isNetworkError(lastError));
      setError(toUserFacingError(lastError, 'Café unavailable'));
      setLoading(false);
    })();

    return () => {
      controller.abort();
    };
  }, [slug, retryNonce]);

  // Clear module slug only when leaving this café route — not on retry remounts.
  useEffect(() => {
    return () => {
      setRuntimeCafeSlug(null);
    };
  }, [slug]);

  const muiTheme = useMemo(() => createCafeMuiTheme(theme), [theme]);

  const value = useMemo<CafeContextValue>(
    () => ({
      loading,
      error,
      isConnectivityError,
      cafe,
      theme,
      activeFeatures,
      retry,
    }),
    [loading, error, isConnectivityError, cafe, theme, activeFeatures, retry],
  );

  // Keep bootstrap failures in-app with retry — do not throw into AppErrorBoundary.
  // A single slow/failed fetch used to flash real UI then a hard "No connection" overlay.
  if (!loading && error && !cafe) {
    return (
      <CafeContext.Provider value={value}>
        <ThemeProvider theme={muiTheme}>
          <CssBaseline />
          <CafeLoadError
            message={error}
            isConnectivity={isConnectivityError}
            onRetry={retry}
          />
        </ThemeProvider>
      </CafeContext.Provider>
    );
  }

  return (
    <CafeContext.Provider value={value}>
      <ThemeProvider theme={muiTheme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </CafeContext.Provider>
  );
}

export function useCafe(): CafeContextValue {
  const ctx = useContext(CafeContext);
  if (!ctx) {
    throw new Error('useCafe must be used within CafeProvider');
  }
  return ctx;
}
