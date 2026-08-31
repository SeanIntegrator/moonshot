import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import type { DrinkArchetypeDef } from '@moonshot/domain';
import { Box, Button, Typography } from '@mui/material';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createMenuItem,
  deleteMenuItem,
  fetchDrinkArchetypes,
  patchMenuItem,
  uploadMenuItemImage,
} from '../../../lib/admin-api.js';
import { useToast } from '../../primitives/ToastProvider.js';
import { ItemEditorFields } from './ItemEditorFields.js';
import { ItemsSidebar } from './ItemsSidebar.js';
import { firstSidebarItemId, resolveSidebarSelection } from './item-sidebar.js';
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
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Record<string, DrinkArchetypeDef>>({});
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<DraftItem | null>(null);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const pendingPreviewUrlRef = useRef<string | null>(null);
  const enabledSections = useMemo(
    () => sections.filter((s) => s.enabled && s.kind !== 'unclassified'),
    [sections],
  );
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    firstSidebarItemId(items, sections),
  );
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null);

  useEffect(() => {
    fetchDrinkArchetypes(token, cafeSlug)
      .then((data) => setRecipes(data.recipes))
      .catch(() => {
        /* item editor still works without recipes */
      });
  }, [token, cafeSlug]);

  useEffect(() => {
    const next = resolveSidebarSelection({
      creating,
      selectedId,
      pendingSelectId,
      itemIds: items.map((i) => i.id),
      fallbackId: firstSidebarItemId(items, sections),
    });
    if (next.selectedId !== selectedId) setSelectedId(next.selectedId);
    if (next.pendingSelectId !== pendingSelectId) setPendingSelectId(next.pendingSelectId);
  }, [items, sections, selectedId, creating, pendingSelectId]);

  useEffect(() => {
    return () => {
      if (pendingPreviewUrlRef.current) {
        URL.revokeObjectURL(pendingPreviewUrlRef.current);
        pendingPreviewUrlRef.current = null;
      }
    };
  }, []);

  function clearPendingImage() {
    if (pendingPreviewUrlRef.current) {
      URL.revokeObjectURL(pendingPreviewUrlRef.current);
      pendingPreviewUrlRef.current = null;
    }
    setPendingImageFile(null);
  }

  function setPendingImage(file: File) {
    if (pendingPreviewUrlRef.current) {
      URL.revokeObjectURL(pendingPreviewUrlRef.current);
    }
    const url = URL.createObjectURL(file);
    pendingPreviewUrlRef.current = url;
    setPendingImageFile(file);
    setCreateDraft((prev) => (prev ? { ...prev, imageUrl: url, imageSource: 'upload' } : prev));
  }

  const categoryOptions = enabledSections.map((s) => ({ value: s.key, label: s.label }));
  const selected = items.find((i) => i.id === selectedId) ?? null;
  const draft = creating
    ? createDraft
    : selected
      ? (drafts[selected.id] ?? toDraft(selected, library))
      : null;
  const dirty =
    creating && createDraft
      ? createDraft.name.trim().length > 0 ||
        createDraft.priceMinor > 0 ||
        pendingImageFile != null
      : selected && draft
        ? itemDraftDirty(draft, selected, library)
        : false;

  function startCreate() {
    const defaultCategory = enabledSections[0]?.key;
    if (!defaultCategory) {
      toast({ severity: 'error', message: 'Add a product category before creating items.' });
      return;
    }
    clearPendingImage();
    setCreating(true);
    setCreateDraft(emptyDraft(defaultCategory));
    setPendingSelectId(null);
    setSelectedId(null);
  }

  function cancelCreate() {
    clearPendingImage();
    setCreating(false);
    setCreateDraft(null);
    setPendingSelectId(null);
    setSelectedId(firstSidebarItemId(items, sections));
  }

  async function saveItem(next: DraftItem) {
    if (creating) {
      if (!next.category.trim()) {
        toast({ severity: 'error', message: 'Choose a category for this product.' });
        return;
      }
      setSavingId('__create__');
      const imageToUpload = pendingImageFile;
      try {
        let created = await createMenuItem(token, cafeSlug, {
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
        if (imageToUpload) {
          try {
            created = await uploadMenuItemImage(token, cafeSlug, created.id, imageToUpload);
          } catch (e) {
            toast({
              severity: 'warning',
              message:
                e instanceof Error
                  ? `Added “${created.name}”, but the photo failed: ${e.message}`
                  : `Added “${created.name}”, but the photo failed to upload.`,
            });
            clearPendingImage();
            setCreating(false);
            setCreateDraft(null);
            setSelectedId(created.id);
            setPendingSelectId(created.id);
            onItemsChanged();
            return;
          }
        }
        toast({ severity: 'success', message: `Added “${created.name}”.` });
        clearPendingImage();
        setCreating(false);
        setCreateDraft(null);
        setSelectedId(created.id);
        setPendingSelectId(created.id);
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

  async function removeItem(item: NormalisedMenuItem): Promise<boolean> {
    setDeletingId(item.id);
    try {
      await deleteMenuItem(token, cafeSlug, item.id);
      setDrafts((prev) => ({
        ...prev,
        [item.id]: { ...(prev[item.id] ?? toDraft(item, library)), isAvailable: false },
      }));
      toast({ severity: 'success', message: `“${item.name}” is hidden.` });
      onItemsChanged();
      return true;
    } catch (e) {
      toast({ severity: 'error', message: e instanceof Error ? e.message : 'Hide failed' });
      return false;
    } finally {
      setDeletingId(null);
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
            clearPendingImage();
            setCreating(false);
            setCreateDraft(null);
            setPendingSelectId(null);
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
              deleting={selected ? deletingId === selected.id : false}
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
              onDelete={selected ? () => removeItem(selected) : undefined}
              onPendingImage={creating ? setPendingImage : undefined}
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
