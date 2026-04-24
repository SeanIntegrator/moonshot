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
import { apiFetch, getCafeSlug } from '../lib/api.js';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [theme, setTheme] = useState<CafeTheme | null>(null);
  const [activeFeatures, setActiveFeatures] = useState<FeatureFlagKey[]>([]);

  useEffect(() => {
    const slug = getCafeSlug();

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
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
