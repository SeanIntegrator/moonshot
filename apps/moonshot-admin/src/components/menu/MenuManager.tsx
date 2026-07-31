import { Alert, Box, Button, CircularProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SyncIcon from '@mui/icons-material/Sync';
import { useCallback, useEffect, useState } from 'react';
import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import {
  fetchMenuForAdmin,
  fetchMenuSections,
  fetchModifierGroups,
  getSquareConnectStatus,
  syncPosMenuFromSquare,
  type SquareConnectStatus,
} from '../../lib/admin-api.js';
import { DrinkArchetypesPanel } from './DrinkArchetypesPanel.js';
import { MenuItemsPanel } from './MenuItemsPanel.js';
import { ModifierLibraryEditor } from './ModifierLibraryEditor.js';

type Props = {
  cafeSlug: string;
  token: string;
};

function formatSyncedAt(iso: string | null): string {
  if (!iso) return 'Never';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function MenuManager({ cafeSlug, token }: Props) {
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
      if (mode === 'soft') {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
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

  if (loading && !ready) {
    return (
      <Paper sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Paper>
    );
  }

  if (error && !ready) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => load('initial')}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      </Paper>
    );
  }

  const squareConnected = squareStatus?.connected === true;

  return (
    <Paper sx={{ p: 3, borderRadius: 2, position: 'relative' }}>
      <Typography variant="h6" gutterBottom>
        Menu & pricing
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add items, sizes, and reusable modifier sections. Changes appear on the order-ahead app
        immediately.
        {squareConnected
          ? ' Square is the source of truth for POS-linked items — use Sync to pull Dashboard changes.'
          : null}
      </Typography>

      {squareConnected && (
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1.5}
          alignItems={{ sm: 'center' }}
          sx={{ mb: 2 }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
            Last synced from Square: {formatSyncedAt(squareStatus?.catalogLastSyncedAt ?? null)}
            {squareStatus?.catalogSyncStatus === 'error' && squareStatus.catalogSyncError
              ? ` — last error: ${squareStatus.catalogSyncError}`
              : null}
          </Typography>
          <Button
            variant="outlined"
            startIcon={syncing ? <CircularProgress size={16} /> : <SyncIcon />}
            disabled={syncing || squareStatus?.status === 'needs_reauth'}
            onClick={() => void handleSyncFromSquare()}
          >
            Sync from Square
          </Button>
        </Stack>
      )}

      {syncNotice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSyncNotice(null)}>
          {syncNotice}
        </Alert>
      )}

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2 }}
          onClose={() => setError(null)}
          action={
            <Button color="inherit" size="small" onClick={() => softReload()}>
              Retry
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Box sx={{ position: 'relative' }}>
        <Box
          sx={{
            opacity: refreshing ? 0.55 : 1,
            pointerEvents: refreshing ? 'none' : 'auto',
            transition: 'opacity 0.15s ease',
          }}
        >
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 2 }}
            spacing={2}
          >
            <Tabs value={tab} onChange={(_, v) => setTab(v)}>
              <Tab label="Items" />
              <Tab label="Sections (milks, syrups…)" />
              <Tab label="Drink types" />
            </Tabs>
            {tab === 0 && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setAddingItem(true)}
              >
                Add item
              </Button>
            )}
          </Stack>

          <Box hidden={tab !== 0}>
            <MenuItemsPanel
              cafeSlug={cafeSlug}
              token={token}
              items={items}
              sections={sections}
              library={library}
              onItemsChanged={softReload}
              creating={addingItem}
              onCreatingChange={setAddingItem}
            />
          </Box>
          <Box hidden={tab !== 1}>
            <ModifierLibraryEditor cafeSlug={cafeSlug} token={token} onLibraryChanged={softReload} />
          </Box>
          <Box hidden={tab !== 2}>
            <DrinkArchetypesPanel cafeSlug={cafeSlug} token={token} />
          </Box>
        </Box>

        {refreshing && (
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: 'rgba(255, 255, 255, 0.35)',
              borderRadius: 1,
              zIndex: 1,
            }}
          >
            <CircularProgress size={28} />
          </Box>
        )}
      </Box>
    </Paper>
  );
}
