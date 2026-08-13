import type { CustomerServerToClientEvent, NormalisedMenu } from '@moonshot/types';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { CUSTOMER_SOCKET_NAMESPACE } from '@moonshot/domain';
import { RealtimeConnection } from '@moonshot/web-runtime';
import { useCafeSlugFromRoute } from '../hooks/useCafePath.js';
import { apiFetch, getApiBaseUrl } from '../lib/api.js';
import { prefetchMenuImages } from '../lib/menu-image-cache.js';

type MenuContextValue = {
  menu: NormalisedMenu | null;
  /** True only on first load when no cached menu exists yet. */
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

const MenuContext = createContext<MenuContextValue | null>(null);

/**
 * Single menu fetch/cache for Home, Menu, ItemDetail, and Checkout.
 * Dedupes in-flight requests and keeps stale menu visible during background refresh.
 * Subscribes to customer:subscribeCafe for push invalidation after POS catalog sync.
 */
export function MenuProvider({ children }: { children: ReactNode }) {
  const slug = useCafeSlugFromRoute();
  const [menu, setMenu] = useState<NormalisedMenu | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inflightRef = useRef<Promise<NormalisedMenu | null> | null>(null);
  const slugRef = useRef(slug);

  const loadMenu = useCallback(
    async (targetSlug: string, { background = false }: { background?: boolean } = {}) => {
      if (inflightRef.current && slugRef.current === targetSlug) {
        await inflightRef.current;
        return;
      }

      slugRef.current = targetSlug;
      if (!background) setLoading(true);

      const fetchTask = async (): Promise<NormalisedMenu | null> => {
        try {
          // Bypass browser HTTP cache (GET /menu has max-age=300) on refresh.
          const data = await apiFetch<NormalisedMenu>('/menu', { cache: 'no-store' });
          if (slugRef.current === targetSlug) {
            // Warm HTTP cache before menu cards mount so thumbs don't pop in late.
            prefetchMenuImages(data.items.map((item) => item.imageUrl));
            setMenu(data);
            setError(null);
          }
          return data;
        } catch (e) {
          if (slugRef.current === targetSlug) {
            setError(e instanceof Error ? e.message : 'Failed to load menu');
          }
          return null;
        } finally {
          if (slugRef.current === targetSlug) {
            setLoading(false);
          }
        }
      };

      const promise = fetchTask().finally(() => {
        if (inflightRef.current === promise) {
          inflightRef.current = null;
        }
      });

      inflightRef.current = promise;
      await promise;
    },
    [],
  );

  useEffect(() => {
    setMenu(null);
    setError(null);
    void loadMenu(slug);
  }, [slug, loadMenu]);

  const refresh = useCallback(async () => {
    await loadMenu(slug, { background: Boolean(menu) });
  }, [loadMenu, slug, menu]);

  // Push: subscribe to café menu invalidation after Square catalog sync.
  useEffect(() => {
    if (!slug || slug === 'unknown') return;
    const baseUrl = getApiBaseUrl();
    if (!baseUrl) return;

    let cancelled = false;
    const connection = new RealtimeConnection({
      baseUrl,
      namespace: CUSTOMER_SOCKET_NAMESPACE,
      onConnect: ({ recovered }) => {
        if (cancelled || recovered) return;
        connection.emit('customer:subscribeCafe', { cafeSlug: slug }, (err?: unknown) => {
          if (err) {
            console.warn('[menu] subscribeCafe failed', err);
          }
        });
      },
      onResume: () => {
        if (cancelled) return;
        void loadMenu(slug, { background: true });
      },
    });

    connection.on('customer:event', (...args: unknown[]) => {
      if (cancelled) return;
      const ev = args[0] as CustomerServerToClientEvent;
      if (ev.type === 'customerMenuUpdated') {
        void loadMenu(slug, { background: true });
      }
    });
    connection.connect();

    return () => {
      cancelled = true;
      connection.destroy();
    };
  }, [slug, loadMenu]);

  const value = useMemo<MenuContextValue>(
    () => ({
      menu,
      loading,
      error,
      refresh,
    }),
    [menu, loading, error, refresh],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu(): MenuContextValue {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error('useMenu requires MenuProvider');
  }
  return ctx;
}
