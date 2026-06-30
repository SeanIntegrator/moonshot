import { CssBaseline, ThemeProvider } from '@mui/material';
import type { Cafe, FeatureFlagKey } from '@moonshot/types';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { CafeTheme } from '@moonshot/types';
import { useCafeSlugFromRoute } from '../hooks/useCafePath.js';
import { apiFetch, setRuntimeCafeSlug } from '../lib/api.js';
import { createCafeMuiTheme } from '../theme/createCafeMuiTheme.js';
import { getTheme } from '../themes/index.js';

export type CafeContextValue = {
  loading: boolean;
  error: string | null;
  cafe: Cafe | null;
  theme: CafeTheme | null;
  activeFeatures: FeatureFlagKey[];
};

const CafeContext = createContext<CafeContextValue | null>(null);

export function CafeProvider({ children }: { children: ReactNode }) {
  const slug = useCafeSlugFromRoute();
  // Sync before child effects (e.g. CheckoutRestore) so X-Cafe-Slug matches the URL slug.
  setRuntimeCafeSlug(slug);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [theme, setTheme] = useState<CafeTheme | null>(null);
  const [activeFeatures, setActiveFeatures] = useState<FeatureFlagKey[]>([]);

  useEffect(() => {
    setLoading(true);

    void (async () => {
      try {
        const data = await apiFetch<{ cafe: Cafe; activeFeatures: FeatureFlagKey[] }>(
          `/cafe/${encodeURIComponent(slug)}`,
        );
        const c = data.cafe;
        setCafe(c);
        setActiveFeatures(data.activeFeatures);
        setTheme(getTheme(c.themeId, c.themeOverrides));
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Network error');
        setCafe(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      setRuntimeCafeSlug(null);
    };
  }, [slug]);

  const muiTheme = useMemo(() => createCafeMuiTheme(theme), [theme]);

  const value = useMemo<CafeContextValue>(
    () => ({
      loading,
      error,
      cafe,
      theme,
      activeFeatures,
    }),
    [loading, error, cafe, theme, activeFeatures],
  );

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
