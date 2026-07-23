import { Alert, Box, Button, CircularProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useCallback, useEffect, useState } from 'react';
import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import { fetchMenuForAdmin, fetchMenuSections, fetchModifierGroups } from '../../lib/admin-api.js';
import { DrinkArchetypesPanel } from './DrinkArchetypesPanel.js';
import { MenuItemsPanel } from './MenuItemsPanel.js';
import { ModifierLibraryEditor } from './ModifierLibraryEditor.js';

type Props = {
  cafeSlug: string;
  token: string;
};

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
      ])
        .then(([menu, groups, menuSections]) => {
          setItems(menu.items);
          setLibrary(groups);
          setSections(menu.sections?.length ? menu.sections : menuSections);
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

  return (
    <Paper sx={{ p: 3, borderRadius: 2, position: 'relative' }}>
      <Typography variant="h6" gutterBottom>
        Menu & pricing
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add items, sizes, and reusable modifier sections. Changes appear on the order-ahead app immediately.
      </Typography>

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
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} spacing={2}>
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
