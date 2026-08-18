import type { CafeMenuSection, CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import type { DrinkArchetypeDef } from '@moonshot/domain';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { MenuSectionTree } from '../../../components/menu/MenuSectionTree.js';
import {
  createMenuItem,
  createMenuSection,
  deleteMenuItem,
  fetchDrinkArchetypes,
  patchMenuItem,
  patchMenuSection,
} from '../../../lib/admin-api.js';
import { ItemEditorFields } from './ItemEditorFields.js';
import { emptyDraft, toDraft, type DraftItem } from './menu-item-draft.js';

type Props = {
  cafeSlug: string;
  token: string;
  items: NormalisedMenuItem[];
  sections: CafeMenuSection[];
  library: CafeModifierGroup[];
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
  onItemsChanged: () => void;
};

export function ItemsTab({
  cafeSlug,
  token,
  items,
  sections,
  library,
  creating,
  onCreatingChange,
  onItemsChanged,
}: Props) {
  const defaultCategory =
    sections.find((s) => s.enabled && !s.parentKey)?.key ??
    sections.find((s) => s.enabled)?.key ??
    sections[0]?.key ??
    'uncategorised';
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [sectionBusyId, setSectionBusyId] = useState<string | null>(null);
  const [newItem, setNewItem] = useState<DraftItem>(() => emptyDraft(defaultCategory));
  const [newSectionLabel, setNewSectionLabel] = useState('');
  const [addingSection, setAddingSection] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Record<string, DrinkArchetypeDef>>({});
  const [priceText, setPriceText] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDrinkArchetypes(token, cafeSlug)
      .then((data) => setRecipes(data.recipes))
      .catch(() => {
        /* item editor still works without recipes */
      });
  }, [token, cafeSlug]);

  const categoryOptions = sections.map((s) => ({ value: s.key, label: s.label }));

  function draftFor(item: NormalisedMenuItem): DraftItem {
    return drafts[item.id] ?? toDraft(item, library);
  }

  async function saveItem(draft: DraftItem) {
    setSavingId(draft.id || 'new');
    setError(null);
    try {
      const body = {
        name: draft.name,
        description: draft.description,
        priceMinor: draft.priceMinor,
        category: draft.category,
        subcategory: draft.subcategory,
        imageUrl: draft.imageUrl,
        isAvailable: draft.isAvailable,
        sizes: draft.sizes,
        modifierGroupIds: draft.attachedGroupIds,
        archetype: draft.archetype,
        waiveMilkSurcharge: draft.waiveMilkSurcharge,
        allowNoMilk: draft.allowNoMilk,
      };
      const updated = draft.id
        ? await patchMenuItem(token, cafeSlug, draft.id, body)
        : await createMenuItem(token, cafeSlug, body);
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[draft.id];
        copy[updated.id] = toDraft(updated, library);
        return copy;
      });
      setNotice(`Saved “${updated.name}”.`);
      onCreatingChange(false);
      setNewItem(emptyDraft(defaultCategory));
      onItemsChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  }

  async function toggleAvailability(item: NormalisedMenuItem, next: boolean) {
    setTogglingId(item.id);
    setError(null);
    try {
      if (next) {
        const updated = await patchMenuItem(token, cafeSlug, item.id, { isAvailable: true });
        setDrafts((prev) => ({ ...prev, [updated.id]: toDraft(updated, library) }));
      } else {
        await deleteMenuItem(token, cafeSlug, item.id);
        setDrafts((prev) => {
          const copy = { ...prev };
          delete copy[item.id];
          return copy;
        });
      }
      setNotice(next ? `“${item.name}” is on the menu.` : `“${item.name}” is hidden.`);
      onItemsChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setTogglingId(null);
    }
  }

  async function toggleSectionEnabled(section: CafeMenuSection, enabled: boolean) {
    setSectionBusyId(section.id);
    setError(null);
    try {
      await patchMenuSection(token, cafeSlug, section.id, { enabled });
      setNotice(enabled ? `“${section.label}” enabled.` : `“${section.label}” disabled.`);
      onItemsChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update section');
    } finally {
      setSectionBusyId(null);
    }
  }

  async function onAddSection() {
    const label = newSectionLabel.trim();
    if (!label) return;
    setAddingSection(true);
    setError(null);
    try {
      await createMenuSection(token, cafeSlug, { label });
      setNewSectionLabel('');
      setNotice(`Added section “${label}”.`);
      onItemsChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add section');
    } finally {
      setAddingSection(false);
    }
  }

  function renderEditor(draft: DraftItem, itemId: string | null) {
    const key = itemId ?? 'new';
    return (
      <ItemEditorFields
        draft={draft}
        itemId={itemId}
        cafeSlug={cafeSlug}
        token={token}
        library={library}
        recipes={recipes}
        categoryOptions={categoryOptions}
        priceText={priceText[key] ?? String(draft.priceMinor / 100)}
        saving={savingId === key}
        onPriceText={(raw) => setPriceText((prev) => ({ ...prev, [key]: raw }))}
        onChange={(next) => {
          if (itemId) setDrafts((prev) => ({ ...prev, [itemId]: next }));
          else setNewItem(next);
        }}
        onSaved={(updated) => {
          if (itemId) setDrafts((prev) => ({ ...prev, [itemId]: updated }));
          else setNewItem(updated);
          onItemsChanged();
        }}
        onSave={() => void saveItem(draft)}
      />
    );
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

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' }, mb: 2 }}>
        <TextField
          size="small"
          label="New section name"
          placeholder="e.g. Ube, Pandan"
          value={newSectionLabel}
          onChange={(e) => setNewSectionLabel(e.target.value)}
          sx={{ maxWidth: 280 }}
        />
        <Button
          variant="outlined"
          size="small"
          disabled={!newSectionLabel.trim() || addingSection}
          onClick={() => void onAddSection()}
        >
          {addingSection ? 'Adding…' : 'Add section'}
        </Button>
      </Stack>

      {creating ? (
        <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, mb: 2 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 700 }}>
            New item
          </Typography>
          {renderEditor(newItem, null)}
          <Button size="small" sx={{ mt: 1 }} onClick={() => onCreatingChange(false)}>
            Cancel
          </Button>
        </Box>
      ) : null}

      <MenuSectionTree
        sections={sections}
        items={items}
        sectionBusyId={sectionBusyId}
        togglingId={togglingId}
        draftFor={draftFor}
        onToggleSection={(s, enabled) => void toggleSectionEnabled(s, enabled)}
        onToggleAvailability={(item, next) => void toggleAvailability(item, next)}
        renderEditor={(draft, itemId) => renderEditor(draft, itemId)}
      />
    </Box>
  );
}
