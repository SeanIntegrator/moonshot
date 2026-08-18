import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import type { DrinkArchetypeDef } from '@moonshot/domain';
import { Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { fetchDrinkArchetypes, patchMenuItem } from '../../../lib/admin-api.js';
import { useToast } from '../../primitives/ToastProvider.js';
import { ItemEditorFields } from './ItemEditorFields.js';
import { ItemsSidebar } from './ItemsSidebar.js';
import { firstSidebarItemId } from './item-sidebar.js';
import { itemDraftDirty, itemPatchBody, toDraft, type DraftItem } from './menu-item-draft.js';

type Props = {
  cafeSlug: string;
  token: string;
  items: NormalisedMenuItem[];
  sections: CafeMenuSection[];
  library: CafeModifierGroup[];
  onItemsChanged: () => void;
};

export function ItemsTab({ cafeSlug, token, items, sections, library, onItemsChanged }: Props) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Record<string, DrinkArchetypeDef>>({});
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    firstSidebarItemId(items, sections),
  );

  useEffect(() => {
    fetchDrinkArchetypes(token, cafeSlug)
      .then((data) => setRecipes(data.recipes))
      .catch(() => {
        /* item editor still works without recipes */
      });
  }, [token, cafeSlug]);

  useEffect(() => {
    if (selectedId && items.some((i) => i.id === selectedId)) return;
    setSelectedId(firstSidebarItemId(items, sections));
  }, [items, sections, selectedId]);

  const categoryOptions = sections.map((s) => ({ value: s.key, label: s.label }));
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const draft = selected ? (drafts[selected.id] ?? toDraft(selected, library)) : null;
  const dirty = selected && draft ? itemDraftDirty(draft, selected, library) : false;

  async function saveItem(next: DraftItem) {
    if (!next.id) return;
    setSavingId(next.id);
    try {
      const updated = await patchMenuItem(token, cafeSlug, next.id, itemPatchBody(next));
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[next.id];
        copy[updated.id] = toDraft(updated, library);
        return copy;
      });
      toast({ severity: 'success', message: `Saved “${updated.name}”.` });
      onItemsChanged();
    } catch (e) {
      toast({ severity: 'error', message: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSavingId(null);
    }
  }

  async function toggleMenu(item: NormalisedMenuItem, next: boolean) {
    setTogglingId(item.id);
    try {
      const updated = await patchMenuItem(token, cafeSlug, item.id, { isAvailable: next });
      setDrafts((prev) => ({
        ...prev,
        [updated.id]: { ...(prev[updated.id] ?? toDraft(item, library)), isAvailable: updated.isAvailable },
      }));
      toast({
        severity: 'success',
        message: next ? `“${item.name}” is on the menu.` : `“${item.name}” is hidden.`,
      });
      onItemsChanged();
    } catch (e) {
      toast({ severity: 'error', message: e instanceof Error ? e.message : 'Update failed' });
    } finally {
      setTogglingId(null);
    }
  }

  function undo() {
    if (!selected) return;
    setDrafts((prev) => {
      const copy = { ...prev };
      delete copy[selected.id];
      return copy;
    });
  }

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'flex-start',
          gap: 2.5,
        }}
      >
        <ItemsSidebar
          items={items}
          sections={sections}
          query={query}
          selectedId={selectedId}
          onQuery={setQuery}
          onSelect={setSelectedId}
        />
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {draft && selected ? (
              <ItemEditorFields
                draft={draft}
                itemId={selected.id}
                cafeSlug={cafeSlug}
                token={token}
                library={library}
                recipes={recipes}
                sections={sections}
                categoryOptions={categoryOptions}
                saving={savingId === selected.id}
                toggling={togglingId === selected.id}
                dirty={dirty}
                valid={draft.name.trim().length > 0}
                onChange={(next) => setDrafts((prev) => ({ ...prev, [selected.id]: next }))}
                onSaved={(updated) => setDrafts((prev) => ({ ...prev, [selected.id]: updated }))}
                onSave={() => void saveItem(draft)}
                onUndo={undo}
                onToggleMenu={(next) => void toggleMenu(selected, next)}
              />
          ) : (
            <Typography variant="body2">Select an item to edit.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
