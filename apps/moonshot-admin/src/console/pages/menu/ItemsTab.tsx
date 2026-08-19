import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import type { DrinkArchetypeDef } from '@moonshot/domain';
import { Box, Button, Typography } from '@mui/material';
import { useEffect, useMemo, useState } from 'react';
import { createMenuItem, fetchDrinkArchetypes, patchMenuItem } from '../../../lib/admin-api.js';
import { useToast } from '../../primitives/ToastProvider.js';
import { ItemEditorFields } from './ItemEditorFields.js';
import { ItemsSidebar } from './ItemsSidebar.js';
import { firstSidebarItemId } from './item-sidebar.js';
import { emptyDraft, itemDraftDirty, itemPatchBody, toDraft, type DraftItem } from './menu-item-draft.js';

type Props = {
  cafeSlug: string;
  token: string;
  items: NormalisedMenuItem[];
  sections: CafeMenuSection[];
  library: CafeModifierGroup[];
  posCafe: boolean;
  onItemsChanged: () => void;
};

export function ItemsTab({
  cafeSlug,
  token,
  items,
  sections,
  library,
  posCafe,
  onItemsChanged,
}: Props) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Record<string, DrinkArchetypeDef>>({});
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<DraftItem | null>(null);
  const enabledSections = useMemo(
    () => sections.filter((s) => s.enabled && s.kind !== 'unclassified'),
    [sections],
  );
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
    if (creating) return;
    if (selectedId && items.some((i) => i.id === selectedId)) return;
    setSelectedId(firstSidebarItemId(items, sections));
  }, [items, sections, selectedId, creating]);

  const categoryOptions = enabledSections.map((s) => ({ value: s.key, label: s.label }));
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const draft = creating
    ? createDraft
    : selected
      ? (drafts[selected.id] ?? toDraft(selected, library))
      : null;
  const dirty =
    creating && createDraft
      ? createDraft.name.trim().length > 0 || createDraft.priceMinor > 0
      : selected && draft
        ? itemDraftDirty(draft, selected, library)
        : false;

  function startCreate() {
    const defaultCategory = enabledSections[0]?.key;
    if (!defaultCategory) {
      toast({ severity: 'error', message: 'Add a product category before creating items.' });
      return;
    }
    setCreating(true);
    setCreateDraft(emptyDraft(defaultCategory));
    setSelectedId(null);
  }

  function cancelCreate() {
    setCreating(false);
    setCreateDraft(null);
    setSelectedId(firstSidebarItemId(items, sections));
  }

  async function saveItem(next: DraftItem) {
    if (creating) {
      if (!next.category.trim()) {
        toast({ severity: 'error', message: 'Choose a category for this product.' });
        return;
      }
      setSavingId('__create__');
      try {
        const created = await createMenuItem(token, cafeSlug, {
          name: next.name.trim(),
          category: next.category,
          priceMinor: next.priceMinor,
          description: next.description,
          subcategory: next.subcategory,
          archetype: next.archetype,
          waiveMilkSurcharge: next.waiveMilkSurcharge,
          allowNoMilk: next.allowNoMilk,
          modifierGroupIds: next.attachedGroupIds,
          sizes: next.sizes,
          tags: next.tags,
        });
        toast({ severity: 'success', message: `Added “${created.name}”.` });
        setCreating(false);
        setCreateDraft(null);
        setSelectedId(created.id);
        onItemsChanged();
      } catch (e) {
        toast({ severity: 'error', message: e instanceof Error ? e.message : 'Create failed' });
      } finally {
        setSavingId(null);
      }
      return;
    }

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
    if (creating) {
      cancelCreate();
      return;
    }
    if (!selected) return;
    setDrafts((prev) => {
      const copy = { ...prev };
      delete copy[selected.id];
      return copy;
    });
  }

  const editorItemId = creating ? null : selected?.id ?? null;

  return (
    <Box>
      {!posCafe ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1.5 }}>
          <Button variant="outlined" size="small" disabled={creating} onClick={startCreate}>
            + Add product
          </Button>
        </Box>
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
          selectedId={creating ? null : selectedId}
          onQuery={setQuery}
          onSelect={(id) => {
            setCreating(false);
            setCreateDraft(null);
            setSelectedId(id);
          }}
        />
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {draft ? (
            <ItemEditorFields
              draft={draft}
              itemId={editorItemId}
              cafeSlug={cafeSlug}
              token={token}
              library={library}
              recipes={recipes}
              sections={sections}
              categoryOptions={categoryOptions}
              categoryRequired={creating}
              saving={savingId === (creating ? '__create__' : selected?.id)}
              toggling={selected ? togglingId === selected.id : false}
              dirty={dirty}
              valid={
                draft.name.trim().length > 0 &&
                draft.category.trim().length > 0 &&
                Number.isFinite(draft.priceMinor)
              }
              onChange={(next) => {
                if (creating) setCreateDraft(next);
                else if (selected) setDrafts((prev) => ({ ...prev, [selected.id]: next }));
              }}
              onSaved={(updated) => setDrafts((prev) => ({ ...prev, [updated.id]: toDraft(updated, library) }))}
              onSave={() => void saveItem(draft)}
              onUndo={undo}
              onToggleMenu={selected ? (next) => void toggleMenu(selected, next) : undefined}
            />
          ) : (
            <Typography variant="body2">Select a product to edit.</Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
