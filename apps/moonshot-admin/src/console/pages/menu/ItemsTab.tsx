import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import type { DrinkArchetypeDef } from '@moonshot/domain';
import { Alert, Box, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { fetchDrinkArchetypes, patchMenuItem } from '../../../lib/admin-api.js';
import { SaveFooter } from '../../primitives/SaveFooter.js';
import { ItemEditorFields } from './ItemEditorFields.js';
import { ItemsSidebar } from './ItemsSidebar.js';
import { itemDraftDirty, toDraft, type DraftItem } from './menu-item-draft.js';

type Props = {
  cafeSlug: string;
  token: string;
  items: NormalisedMenuItem[];
  sections: CafeMenuSection[];
  library: CafeModifierGroup[];
  onItemsChanged: () => void;
};

export function ItemsTab({ cafeSlug, token, items, sections, library, onItemsChanged }: Props) {
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Record<string, DrinkArchetypeDef>>({});
  const [priceText, setPriceText] = useState<Record<string, string>>({});
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(items[0]?.id ?? null);

  useEffect(() => {
    fetchDrinkArchetypes(token, cafeSlug)
      .then((data) => setRecipes(data.recipes))
      .catch(() => {
        /* item editor still works without recipes */
      });
  }, [token, cafeSlug]);

  useEffect(() => {
    if (selectedId && items.some((i) => i.id === selectedId)) return;
    setSelectedId(items[0]?.id ?? null);
  }, [items, selectedId]);

  const categoryOptions = sections.map((s) => ({ value: s.key, label: s.label }));
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const draft = selected ? (drafts[selected.id] ?? toDraft(selected, library)) : null;
  const dirty = selected && draft ? itemDraftDirty(draft, selected, library) : false;

  async function saveItem(next: DraftItem) {
    if (!next.id) return;
    setSavingId(next.id);
    setError(null);
    try {
      const updated = await patchMenuItem(token, cafeSlug, next.id, {
        name: next.name,
        description: next.description,
        priceMinor: next.priceMinor,
        category: next.category,
        subcategory: next.subcategory,
        imageUrl: next.imageUrl,
        isAvailable: next.isAvailable,
        sizes: next.sizes,
        modifierGroupIds: next.attachedGroupIds,
        archetype: next.archetype,
        waiveMilkSurcharge: next.waiveMilkSurcharge,
        allowNoMilk: next.allowNoMilk,
      });
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[next.id];
        copy[updated.id] = toDraft(updated, library);
        return copy;
      });
      setNotice(`Saved “${updated.name}”.`);
      onItemsChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  }

  async function toggleMenu(item: NormalisedMenuItem, next: boolean) {
    setTogglingId(item.id);
    setError(null);
    try {
      const updated = await patchMenuItem(token, cafeSlug, item.id, { isAvailable: next });
      setDrafts((prev) => ({
        ...prev,
        [updated.id]: { ...(prev[updated.id] ?? toDraft(item, library)), isAvailable: updated.isAvailable },
      }));
      setNotice(next ? `“${item.name}” is on the menu.` : `“${item.name}” is hidden.`);
      onItemsChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
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
    setPriceText((prev) => {
      const copy = { ...prev };
      delete copy[selected.id];
      return copy;
    });
  }

  return (
    <Box>
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {notice ? (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      ) : null}
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
            <>
              <ItemEditorFields
                draft={draft}
                itemId={selected.id}
                cafeSlug={cafeSlug}
                token={token}
                library={library}
                recipes={recipes}
                sections={sections}
                categoryOptions={categoryOptions}
                priceText={priceText[selected.id] ?? String(draft.priceMinor / 100)}
                saving={savingId === selected.id}
                toggling={togglingId === selected.id}
                onPriceText={(raw) => setPriceText((prev) => ({ ...prev, [selected.id]: raw }))}
                onChange={(next) => setDrafts((prev) => ({ ...prev, [selected.id]: next }))}
                onSaved={(updated) => setDrafts((prev) => ({ ...prev, [selected.id]: updated }))}
                onToggleMenu={(next) => void toggleMenu(selected, next)}
              />
              <SaveFooter
                label="Save item"
                dirty={dirty}
                valid={draft.name.trim().length > 0}
                saving={savingId === selected.id}
                onSave={() => void saveItem(draft)}
                secondaryLabel="Undo changes"
                secondaryVariant="outlined"
                onSecondary={undo}
                showUnsaved={false}
              />
            </>
          ) : (
            <Typography variant="body2">Select an item to edit.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
