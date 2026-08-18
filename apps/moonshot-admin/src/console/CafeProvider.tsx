import { cafeOpenStatusForCafe } from '@moonshot/domain';
import type {
  AdminSettingsPatchBody,
  AdminSettingsResponse,
  Cafe,
  CafeHoursOverride,
  CafeOpenStatus,
  PauseDuration,
} from '@moonshot/types';
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
import {
  deleteHoursOverride,
  extendCafePause,
  fetchPublicCafe,
  patchAdminSettings,
  pauseCafeOrders,
  resumeCafeOrders,
  upsertHoursOverride,
} from '../lib/admin-api.js';

type CafeContextValue = {
  cafe: Cafe;
  openStatus: CafeOpenStatus;
  reload: () => void;
  patchSettings: (body: AdminSettingsPatchBody) => Promise<Cafe>;
  pauseOrders: (duration: PauseDuration) => Promise<Cafe>;
  resumeOrders: () => Promise<Cafe>;
  extendPause: () => Promise<Cafe>;
  saveHoursOverride: (
    body: Pick<CafeHoursOverride, 'date' | 'label' | 'closed' | 'intervals'>,
  ) => Promise<Cafe>;
  removeHoursOverride: (date: string) => Promise<Cafe>;
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

  const apply = useCallback(async (run: () => Promise<AdminSettingsResponse>): Promise<Cafe> => {
    const data = await run();
    setCafe(data.cafe);
    return data.cafe;
  }, []);

  const patchSettings = useCallback(
    async (body: AdminSettingsPatchBody): Promise<Cafe> => {
      if (!token) throw new Error('Not signed in');
      return apply(() => patchAdminSettings(token, body));
    },
    [token, apply],
  );

  const pauseOrders = useCallback(
    async (duration: PauseDuration): Promise<Cafe> => {
      if (!token) throw new Error('Not signed in');
      return apply(() => pauseCafeOrders(token, duration));
    },
    [token, apply],
  );

  const resumeOrders = useCallback(async (): Promise<Cafe> => {
    if (!token) throw new Error('Not signed in');
    return apply(() => resumeCafeOrders(token));
  }, [token, apply]);

  const extendPauseFn = useCallback(async (): Promise<Cafe> => {
    if (!token) throw new Error('Not signed in');
    return apply(() => extendCafePause(token));
  }, [token, apply]);

  const saveHoursOverride = useCallback(
    async (
      body: Pick<CafeHoursOverride, 'date' | 'label' | 'closed' | 'intervals'>,
    ): Promise<Cafe> => {
      if (!token) throw new Error('Not signed in');
      return apply(() => upsertHoursOverride(token, body));
    },
    [token, apply],
  );

  const removeHoursOverride = useCallback(
    async (date: string): Promise<Cafe> => {
      if (!token) throw new Error('Not signed in');
      return apply(() => deleteHoursOverride(token, date));
    },
    [token, apply],
  );

  const openStatus = useMemo<CafeOpenStatus>(() => {
    if (!cafe) return { isOpen: false, caption: 'Closed', reason: 'closed' };
    return cafeOpenStatusForCafe(cafe);
  }, [cafe]);

  const value = useMemo<CafeContextValue | null>(() => {
    if (!cafe) return null;
    return {
      cafe,
      openStatus,
      reload: load,
      patchSettings,
      pauseOrders,
      resumeOrders,
      extendPause: extendPauseFn,
      saveHoursOverride,
      removeHoursOverride,
    };
  }, [
    cafe,
    openStatus,
    load,
    patchSettings,
    pauseOrders,
    resumeOrders,
    extendPauseFn,
    saveHoursOverride,
    removeHoursOverride,
  ]);

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
