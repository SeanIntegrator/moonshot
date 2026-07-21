import { Alert, Box, Button, CircularProgress, Paper, Stack, Tab, Tabs, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useCallback, useEffect, useState } from 'react';
import type { CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import { fetchMenuForAdmin, fetchModifierGroups } from '../../lib/admin-api.js';
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
  const [library, setLibrary] = useState<CafeModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchMenuForAdmin(token, cafeSlug), fetchModifierGroups(token, cafeSlug)])
      .then(([menu, groups]) => {
        setItems(menu.items);
        setLibrary(groups);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load menu'))
      .finally(() => setLoading(false));
  }, [cafeSlug, token]);

  useEffect(() => {
    reload();
  }, [reload]);

  if (loading) {
    return (
      <Paper sx={{ p: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress size={32} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Paper sx={{ p: 2 }}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => reload()}>
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
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Menu & pricing
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Add items, sizes, and reusable modifier sections. Changes appear on the order-ahead app immediately.
      </Typography>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }} spacing={2}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label="Items" />
          <Tab label="Sections (milks, syrups…)" />
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
          library={library}
          onItemsChanged={reload}
          creating={addingItem}
          onCreatingChange={setAddingItem}
        />
      </Box>
      <Box hidden={tab !== 1}>
        <ModifierLibraryEditor cafeSlug={cafeSlug} token={token} onLibraryChanged={reload} />
      </Box>
    </Paper>
  );
}
