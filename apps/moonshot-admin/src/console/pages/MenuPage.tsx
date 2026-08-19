import SyncIcon from '@mui/icons-material/Sync';
import { Alert, Box, Button, CircularProgress, Tab, Tabs, Typography } from '@mui/material';
import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem, StockChipKey } from '@moonshot/types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { useCafe } from '../CafeProvider.js';
import { useAdminMenuSync } from '../../hooks/useAdminMenuSync.js';
import {
  fetchMenuForAdmin,
  fetchMenuSections,
  fetchModifierGroups,
  getSquareConnectStatus,
  syncPosMenuFromSquare,
  type SquareConnectStatus,
} from '../../lib/admin-api.js';
import { formatTime24 } from '../../lib/format.js';
import { PageHeader } from '../primitives/PageHeader.js';
import { MenuPageSkeleton } from '../primitives/skeletons/MenuPageSkeleton.js';
import { useToast } from '../primitives/ToastProvider.js';
import {
  hasUnclassifiedSections,
  MODIFIER_FAMILY_TABS,
  optionCountForFamily,
  visibleCatalogListTabs,
} from './menu/item-sidebar.js';
import { catalogGroupsForPos, isPosCatalogCafe } from './menu/modifier-list-copy.js';
import { ItemsTab } from './menu/ItemsTab.js';
import { ModifierListsTab } from './menu/ModifierListsTab.js';

type MenuTab = 'products' | Exclude<StockChipKey, 'food'>;

function formatSyncedClock(iso: string | null, timeZone: string): string {
  if (!iso) return 'Never';
  try {
    return formatTime24(new Date(iso), timeZone);
  } catch {
    return 'Never';
  }
}

export function MenuPage() {
  const { session } = useAuth();
  const { cafe } = useCafe();
  const toast = useToast();
  const token = session?.token ?? '';
  const cafeSlug = session?.cafe.slug ?? '';
  const [tab, setTab] = useState<MenuTab>('products');
  const [items, setItems] = useState<NormalisedMenuItem[]>([]);
  const [sections, setSections] = useState<CafeMenuSection[]>([]);
  const [library, setLibrary] = useState<CafeModifierGroup[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [squareStatus, setSquareStatus] = useState<SquareConnectStatus | null>(null);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(
    (mode: 'initial' | 'soft') => {
      if (!token || !cafeSlug) return;
      if (mode !== 'soft') setLoading(true);
      Promise.all([
        fetchMenuForAdmin(token, cafeSlug),
        fetchModifierGroups(token, cafeSlug),
        fetchMenuSections(token, cafeSlug),
        getSquareConnectStatus(token).catch(() => null),
      ])
        .then(([menu, groups, menuSections, square]) => {
          setItems(menu.items);
          setLibrary(groups);
          setSections(menu.sections?.length ? menu.sections : menuSections);
          setSquareStatus(square);
          setReady(true);
        })
        .catch((e) =>
          toast({ severity: 'error', message: e instanceof Error ? e.message : 'Failed to load menu' }),
        )
        .finally(() => {
          setLoading(false);
        });
    },
    [cafeSlug, token, toast],
  );

  useEffect(() => {
    setReady(false);
    load('initial');
  }, [load]);

  const softReload = useCallback(() => load('soft'), [load]);
  const squareConnected = squareStatus?.connected === true;
  const posCafe = isPosCatalogCafe(squareStatus);
  const catalogLibrary = useMemo(
    () => catalogGroupsForPos(library, posCafe),
    [library, posCafe],
  );
  const listTabs = useMemo(
    () => visibleCatalogListTabs(MODIFIER_FAMILY_TABS, catalogLibrary, posCafe),
    [posCafe, catalogLibrary],
  );
  const showUnclassifiedBanner = posCafe && hasUnclassifiedSections(sections);

  useEffect(() => {
    if (tab !== 'products' && !listTabs.some((t) => t.value === tab)) setTab('products');
  }, [tab, listTabs]);

  useAdminMenuSync({
    token,
    enabled: ready && squareConnected,
    knownSyncedAt: squareStatus?.catalogLastSyncedAt ?? null,
    onMenuSynced: (ev) => {
      toast({
        severity: 'success',
        message:
          `Menu updated from Square — ${ev.upsertedItems} item(s)` +
          (ev.softDeletedItems > 0 ? `, ${ev.softDeletedItems} hidden` : ''),
      });
      setSquareStatus((prev) =>
        prev ? { ...prev, catalogLastSyncedAt: ev.syncedAt, catalogSyncStatus: 'idle' } : prev,
      );
      softReload();
    },
    onReconcileSyncDetected: () => {
      toast({ severity: 'success', message: 'Menu updated from Square' });
      softReload();
    },
  });

  async function handleSyncFromSquare(): Promise<void> {
    setSyncing(true);
    try {
      const result = await syncPosMenuFromSquare(token);
      toast({
        severity: 'success',
        message:
          `Synced from Square — ${result.upsertedItems} item(s) updated` +
          (result.softDeletedItems > 0 ? `, ${result.softDeletedItems} hidden` : ''),
      });
      softReload();
    } catch (e) {
      toast({ severity: 'error', message: e instanceof Error ? e.message : 'Square sync failed' });
    } finally {
      setSyncing(false);
    }
  }

  if (!session) return null;

  const syncedLabel = formatSyncedClock(squareStatus?.catalogLastSyncedAt ?? null, cafe.timezone);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader
        title="Menu & prices"
        description={
          squareConnected
            ? 'Prices and content come from Square. Add photos and choose which options each drink offers.'
            : 'Add photos and choose which options each drink offers. Name, description, sizes and prices are all yours.'
        }
        action={
          squareConnected ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Typography variant="body2">Synced {syncedLabel}</Typography>
              <Button
                variant="outlined"
                startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
                disabled={syncing || squareStatus?.status === 'needs_reauth'}
                onClick={() => void handleSyncFromSquare()}
              >
                Sync from Square
              </Button>
            </Box>
          ) : undefined
        }
      />

      {showUnclassifiedBanner ? (
        <Alert severity="info">
          Some Square categories are not under a <strong>Food</strong> or <strong>Drink(s)</strong>{' '}
          parent. Add those parent categories in Square, nest your menus under them, then sync again.
        </Alert>
      ) : null}

      {loading && !ready ? (
        <MenuPageSkeleton />
      ) : (
        <Box>
          <Tabs
            value={tab}
            onChange={(_, v: MenuTab) => setTab(v)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ mb: 1.5 }}
          >
            <Tab value="products" label={`Products ${items.length}`} />
            {listTabs.map((t) => (
              <Tab
                key={t.value}
                value={t.value}
                label={`${t.label} ${optionCountForFamily(catalogLibrary, t.value)}`}
              />
            ))}
          </Tabs>
          {tab !== 'products' ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Reusable lists. Every drink that offers this list uses these options. Stock lives on
              the Stock tab.
            </Typography>
          ) : null}
          {tab === 'products' ? (
            <ItemsTab
              cafeSlug={cafeSlug}
              token={token}
              items={items}
              sections={sections}
              library={catalogLibrary}
              posCafe={posCafe}
              onItemsChanged={softReload}
            />
          ) : (
            <ModifierListsTab
              cafeSlug={cafeSlug}
              token={token}
              family={tab}
              groups={catalogLibrary}
              items={items}
              onLibraryChanged={softReload}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
