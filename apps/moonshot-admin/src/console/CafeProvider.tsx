import { cafeOpenStatus } from '@moonshot/domain';
import type { AdminSettingsPatchBody, Cafe, CafeOpenStatus } from '@moonshot/types';
import { Alert, Box, Button, CircularProgress } from '@mui/material';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useAuth } from '../context/AuthContext.js';
import { fetchPublicCafe, patchAdminSettings } from '../lib/admin-api.js';

type CafeContextValue = {
  cafe: Cafe;
  openStatus: CafeOpenStatus;
  reload: () => void;
  patchSettings: (body: AdminSettingsPatchBody) => Promise<Cafe>;
};

const CafeContext = createContext<CafeContextValue | null>(null);

export function CafeProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const slug = session?.cafe.slug;
  const token = session?.token;

  const load = useCallback(() => {
    if (!slug) return;
    setError(null);
    setLoading(true);
    fetchPublicCafe(slug)
      .then((payload) => setCafe(payload.cafe))
      .catch((e) => {
        setCafe(null);
        setError(e instanceof Error ? e.message : 'Failed to load café');
      })
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  const patchSettings = useCallback(
    async (body: AdminSettingsPatchBody): Promise<Cafe> => {
      if (!token) throw new Error('Not signed in');
      const data = await patchAdminSettings(token, body);
      setCafe(data.cafe);
      return data.cafe;
    },
    [token],
  );

  const openStatus = useMemo<CafeOpenStatus>(() => {
    if (!cafe) return { isOpen: false, caption: 'Closed' };
    return cafeOpenStatus(cafe.hours, cafe.timezone);
  }, [cafe]);

  const value = useMemo<CafeContextValue | null>(() => {
    if (!cafe) return null;
    return { cafe, openStatus, reload: load, patchSettings };
  }, [cafe, openStatus, load, patchSettings]);

  if (error && !cafe) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={load}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Box>
    );
  }

  if (!value) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        {loading ? <CircularProgress /> : null}
      </Box>
    );
  }

  return <CafeContext.Provider value={value}>{children}</CafeContext.Provider>;
}

export function useCafe(): CafeContextValue {
  const ctx = useContext(CafeContext);
  if (!ctx) {
    throw new Error('useCafe must be used within CafeProvider');
  }
  return ctx;
}
