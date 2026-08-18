import SyncIcon from '@mui/icons-material/Sync';
import { Alert, Box, Button, CircularProgress, Tab, Tabs, Typography } from '@mui/material';
import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem, StockChipKey } from '@moonshot/types';
import { useCallback, useEffect, useState } from 'react';
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
import { optionCountForChip } from './menu/item-sidebar.js';
import { ItemsTab } from './menu/ItemsTab.js';
import { ModifierListsTab } from './menu/ModifierListsTab.js';

type MenuTab = 'items' | Exclude<StockChipKey, 'food'>;

const LIST_TABS: ReadonlyArray<{ value: Exclude<StockChipKey, 'food'>; label: string }> = [
  { value: 'milk', label: 'Milk' },
  { value: 'syrup', label: 'Syrup' },
  { value: 'beans', label: 'Beans' },
  { value: 'shots', label: 'Shots' },
  { value: 'toppings', label: 'Toppings' },
];

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
  const token = session?.token ?? '';
  const cafeSlug = session?.cafe.slug ?? '';
  const [tab, setTab] = useState<MenuTab>('items');
  const [items, setItems] = useState<NormalisedMenuItem[]>([]);
  const [sections, setSections] = useState<CafeMenuSection[]>([]);
  const [library, setLibrary] = useState<CafeModifierGroup[]>([]);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [squareStatus, setSquareStatus] = useState<SquareConnectStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const load = useCallback(
    (mode: 'initial' | 'soft') => {
      if (!token || !cafeSlug) return;
      if (mode === 'soft') setRefreshing(true);
      else setLoading(true);
      setError(null);
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
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load menu'))
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [cafeSlug, token],
  );

  useEffect(() => {
    setReady(false);
    load('initial');
  }, [load]);

  const softReload = useCallback(() => load('soft'), [load]);
  const squareConnected = squareStatus?.connected === true;

  useAdminMenuSync({
    token,
    enabled: ready && squareConnected,
    knownSyncedAt: squareStatus?.catalogLastSyncedAt ?? null,
    onMenuSynced: (ev) => {
      setSyncNotice(
        `Menu updated from Square — ${ev.upsertedItems} item(s)` +
          (ev.softDeletedItems > 0 ? `, ${ev.softDeletedItems} hidden` : ''),
      );
      setSquareStatus((prev) =>
        prev ? { ...prev, catalogLastSyncedAt: ev.syncedAt, catalogSyncStatus: 'idle' } : prev,
      );
      softReload();
    },
    onReconcileSyncDetected: () => {
      setSyncNotice('Menu updated from Square');
      softReload();
    },
  });

  async function handleSyncFromSquare(): Promise<void> {
    setSyncing(true);
    setSyncNotice(null);
    setError(null);
    try {
      const result = await syncPosMenuFromSquare(token);
      setSyncNotice(
        `Synced from Square — ${result.upsertedItems} item(s) updated` +
          (result.softDeletedItems > 0 ? `, ${result.softDeletedItems} hidden` : ''),
      );
      softReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Square sync failed');
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

      {syncNotice ? (
        <Alert severity="success" onClose={() => setSyncNotice(null)}>
          {syncNotice}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {loading && !ready ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ opacity: refreshing ? 0.55 : 1, pointerEvents: refreshing ? 'none' : 'auto' }}>
          <Tabs
            value={tab}
            onChange={(_, v: MenuTab) => setTab(v)}
            variant="scrollable"
            allowScrollButtonsMobile
            sx={{ mb: 1.5 }}
          >
            <Tab value="items" label={`Items ${items.length}`} />
            {LIST_TABS.map((t) => (
              <Tab
                key={t.value}
                value={t.value}
                label={`${t.label} ${optionCountForChip(library, t.value)}`}
              />
            ))}
          </Tabs>
          {tab !== 'items' ? (
            <Typography variant="body2" sx={{ mb: 2 }}>
              Reusable lists. Every drink that offers this list uses these options. Stock lives on
              the Stock tab.
            </Typography>
          ) : null}
          {tab === 'items' ? (
            <ItemsTab
              cafeSlug={cafeSlug}
              token={token}
              items={items}
              sections={sections}
              library={library}
              onItemsChanged={softReload}
            />
          ) : (
            <ModifierListsTab
              cafeSlug={cafeSlug}
              token={token}
              chip={tab}
              groups={library}
              items={items}
              onLibraryChanged={softReload}
            />
          )}
        </Box>
      )}
    </Box>
  );
}
