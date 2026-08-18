import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import { Alert, Box, Button, CircularProgress, Tab, Tabs, Typography } from '@mui/material';
import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import { useCallback, useEffect, useState } from 'react';
import { DrinkArchetypesPanel } from '../../components/menu/DrinkArchetypesPanel.js';
import { useAuth } from '../../context/AuthContext.js';
import { useAdminMenuSync } from '../../hooks/useAdminMenuSync.js';
import {
  fetchMenuForAdmin,
  fetchMenuSections,
  fetchModifierGroups,
  getSquareConnectStatus,
  syncPosMenuFromSquare,
  type SquareConnectStatus,
} from '../../lib/admin-api.js';
import { PageHeader } from '../primitives/PageHeader.js';
import { ItemsTab } from './menu/ItemsTab.js';
import { ModifierListsTab } from './menu/ModifierListsTab.js';

function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function MenuPage() {
  const { session } = useAuth();
  const token = session?.token ?? '';
  const cafeSlug = session?.cafe.slug ?? '';
  const [tab, setTab] = useState(0);
  const [addingItem, setAddingItem] = useState(false);
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

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader
        title="Menu & prices"
        description={
          squareConnected
            ? 'Square owns names, prices, and POS modifier lists. Photos, recipes, and Moonshot prep lists stay editable here.'
            : 'Add photos and choose which options each drink offers.'
        }
        action={
          tab === 0 ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddingItem(true)}>
              Add item
            </Button>
          ) : undefined
        }
      />

      {squareConnected ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
          <Typography variant="body2" sx={{ flex: 1 }}>
            Last synced from Square: {formatSyncedAt(squareStatus?.catalogLastSyncedAt ?? null)}
          </Typography>
          <Button
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
            disabled={syncing || squareStatus?.status === 'needs_reauth'}
            onClick={() => void handleSyncFromSquare()}
          >
            Sync from Square
          </Button>
        </Box>
      ) : null}

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
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Items" />
            <Tab label="Modifier lists" />
            <Tab label="Drink types" />
          </Tabs>
          {tab === 0 ? (
            <ItemsTab
              cafeSlug={cafeSlug}
              token={token}
              items={items}
              sections={sections}
              library={library}
              creating={addingItem}
              onCreatingChange={setAddingItem}
              onItemsChanged={softReload}
            />
          ) : null}
          {tab === 1 ? (
            <ModifierListsTab
              cafeSlug={cafeSlug}
              token={token}
              groups={library}
              onLibraryChanged={softReload}
            />
          ) : null}
          {tab === 2 ? <DrinkArchetypesPanel cafeSlug={cafeSlug} token={token} /> : null}
        </Box>
      )}
    </Box>
  );
}
