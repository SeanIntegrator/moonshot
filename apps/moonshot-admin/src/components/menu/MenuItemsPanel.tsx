import type {
  CafeMenuSection,
  CafeModifierGroup,
  DrinkArchetypeDef,
  DrinkArchetypeId,
  NormalisedMenuItem,
} from '@moonshot/types';
import {
  DRINK_ARCHETYPE_SLOT_GROUP_NAMES,
  isDrinkArchetypeId,
} from '@moonshot/types';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import {
  createMenuItem,
  createMenuSection,
  deleteMenuItem,
  fetchDrinkArchetypes,
  patchMenuItem,
  patchMenuSection,
} from '../../lib/admin-api.js';
import { MenuItemImageField } from './MenuItemImageField.js';
import { MenuSectionBlock } from './MenuSectionBlock.js';
import { SizeEditor } from './SizeEditor.js';

type DraftItem = NormalisedMenuItem & { attachedGroupIds: string[] };

function toDraft(item: NormalisedMenuItem, library: CafeModifierGroup[]): DraftItem {
  const libraryIds = new Set(library.map((g) => g.id));
  return {
    ...structuredClone(item),
    sizes: item.sizes ?? [],
    archetype: item.archetype ?? null,
    waiveMilkSurcharge: item.waiveMilkSurcharge ?? false,
    attachedGroupIds: item.modifierGroups.filter((g) => libraryIds.has(g.id)).map((g) => g.id),
  };
}

function emptyDraft(defaultCategory: string): DraftItem {
  return {
    id: '',
    posItemId: null,
    name: '',
    description: null,
    priceMinor: 0,
    currency: 'GBP',
    category: defaultCategory,
    subcategory: null,
    imageUrl: null,
    emoji: null,
    isAvailable: true,
    sizes: [],
    modifierGroups: [],
    tags: [],
    archetype: null,
    waiveMilkSurcharge: false,
    attachedGroupIds: [],
  };
}

function applyArchetypeToDraft(
  draft: DraftItem,
  archetypeId: DrinkArchetypeId | null,
  recipe: DrinkArchetypeDef | null,
  library: CafeModifierGroup[],
): DraftItem {
  if (!archetypeId || !recipe) {
    return { ...draft, archetype: null, waiveMilkSurcharge: false };
  }
  const byName = new Map(library.map((g) => [g.name, g]));
  const attachedGroupIds: string[] = [];
  for (const slot of recipe.slots) {
    const groupName = DRINK_ARCHETYPE_SLOT_GROUP_NAMES[slot];
    const group = byName.get(groupName);
    if (!group) continue;
    if (slot === 'syrup' && group.options.length === 0) continue;
    attachedGroupIds.push(group.id);
  }
  return {
    ...draft,
    archetype: archetypeId,
    waiveMilkSurcharge: recipe.milkCharge === 'waived',
    attachedGroupIds,
  };
}

type Props = {
  cafeSlug: string;
  token: string;
  items: NormalisedMenuItem[];
  sections: CafeMenuSection[];
  library: CafeModifierGroup[];
  onItemsChanged: () => void;
  /** "Add item" is triggered from the parent header so it can sit inline with the tabs. */
  creating: boolean;
  onCreatingChange: (creating: boolean) => void;
};

export function MenuItemsPanel({
  cafeSlug,
  token,
  items,
  sections,
  library,
  onItemsChanged,
  creating,
  onCreatingChange,
}: Props) {
  const defaultCategory = sections.find((s) => s.key === 'hot_drinks')?.key ?? sections[0]?.key ?? 'hot_drinks';
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
  // Raw text for the base-price input, keyed by item id (or "new") — lets the field be
  // fully cleared while typing instead of always reflecting priceMinor as a number.
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

  function setDraft(itemId: string, next: DraftItem) {
    setDrafts((prev) => ({ ...prev, [itemId]: next }));
  }

  function toggleGroup(draft: DraftItem, groupId: string): DraftItem {
    const has = draft.attachedGroupIds.includes(groupId);
    return {
      ...draft,
      attachedGroupIds: has
        ? draft.attachedGroupIds.filter((id) => id !== groupId)
        : [...draft.attachedGroupIds, groupId],
    };
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
      let updated: NormalisedMenuItem;
      if (next) {
        updated = await patchMenuItem(token, cafeSlug, item.id, { isAvailable: true });
      } else {
        await deleteMenuItem(token, cafeSlug, item.id);
        updated = { ...item, isAvailable: false };
      }
      setDrafts((prev) => {
        const copy = { ...prev };
        delete copy[item.id];
        copy[updated.id] = toDraft(updated, library);
        return copy;
      });
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
    const update = (patch: Partial<DraftItem>) => {
      if (itemId) setDraft(itemId, { ...draft, ...patch });
      else setNewItem({ ...draft, ...patch });
    };

    const selectOptions =
      categoryOptions.some((c) => c.value === draft.category)
        ? categoryOptions
        : [...categoryOptions, { value: draft.category, label: draft.category }];

    return (
      <Stack spacing={2}>
        <FormControl size="small" sx={{ maxWidth: 280 }}>
          <InputLabel>Category</InputLabel>
          <Select
            label="Category"
            value={draft.category}
            onChange={(e) => update({ category: e.target.value })}
          >
            {selectOptions.map((c) => (
              <MenuItem key={c.value} value={c.value}>
                {c.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ maxWidth: 320 }}>
          <InputLabel>Drink type</InputLabel>
          <Select
            label="Drink type"
            value={draft.archetype ?? ''}
            onChange={(e) => {
              const value = e.target.value;
              if (!value) {
                const next = applyArchetypeToDraft(draft, null, null, library);
                if (itemId) setDraft(itemId, next);
                else setNewItem(next);
                return;
              }
              if (!isDrinkArchetypeId(value)) return;
              const recipe = recipes[value] ?? null;
              const next = applyArchetypeToDraft(draft, value, recipe, library);
              if (itemId) setDraft(itemId, next);
              else setNewItem(next);
            }}
          >
            <MenuItem value="">None (food / custom)</MenuItem>
            {Object.values(recipes).map((r) => (
              <MenuItem key={r.id} value={r.id}>
                {r.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            gap: 2,
            alignItems: 'flex-start',
          }}
        >
          <Stack spacing={2} sx={{ flex: 2, minWidth: 0, width: '100%' }}>
            <TextField
              label="Item name"
              size="small"
              required
              fullWidth
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <TextField
              label="Description"
              size="small"
              multiline
              minRows={2}
              fullWidth
              value={draft.description ?? ''}
              onChange={(e) => update({ description: e.target.value || null })}
            />
            {draft.sizes.length === 0 && (
              <TextField
                label={`Base price (${draft.currency})`}
                type="number"
                size="small"
                value={priceText[key] ?? String(draft.priceMinor / 100)}
                onChange={(e) => {
                  const raw = e.target.value;
                  setPriceText((prev) => ({ ...prev, [key]: raw }));
                  if (raw.trim() === '') {
                    update({ priceMinor: 0 });
                    return;
                  }
                  const v = Number.parseFloat(raw);
                  if (Number.isFinite(v)) update({ priceMinor: Math.round(v * 100) });
                }}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ maxWidth: 200 }}
              />
            )}
          </Stack>

          <Box sx={{ flex: 1, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
            <MenuItemImageField
              cafeSlug={cafeSlug}
              token={token}
              itemId={itemId}
              imageUrl={draft.imageUrl}
              itemName={draft.name || 'Menu item'}
              disabled={savingId === (itemId ?? 'new')}
              onUploaded={(updated) => {
                if (itemId) {
                  setDraft(itemId, toDraft(updated, library));
                } else {
                  setNewItem(toDraft(updated, library));
                }
                onItemsChanged();
              }}
            />
          </Box>
        </Box>

        <SizeEditor
          sizes={draft.sizes}
          currency={draft.currency}
          onChange={(sizes) => update({ sizes })}
        />

        {library.length > 0 && (
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Modifier sections on this item
            </Typography>
            <FormGroup>
              {library.map((g) => (
                <FormControlLabel
                  key={g.id}
                  control={
                    <Checkbox
                      checked={draft.attachedGroupIds.includes(g.id)}
                      onChange={() => {
                        const next = toggleGroup(draft, g.id);
                        if (itemId) setDraft(itemId, next);
                        else setNewItem(next);
                      }}
                    />
                  }
                  label={`${g.name} (${g.selectionType}${g.required ? ', required' : ''})`}
                />
              ))}
            </FormGroup>
            {draft.attachedGroupIds.some((id) => {
              const g = library.find((x) => x.id === id);
              return g?.name === 'Milks' || g?.name === 'Milk';
            }) && (
              <FormControlLabel
                sx={{ mt: 1 }}
                control={
                  <Switch
                    checked={draft.waiveMilkSurcharge}
                    onChange={(e) => update({ waiveMilkSurcharge: e.target.checked })}
                  />
                }
                label="Waive alt-milk surcharge on this item"
              />
            )}
          </Box>
        )}

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            size="small"
            disabled={!draft.name.trim() || savingId === (itemId ?? 'new')}
            onClick={() => void saveItem(draft)}
          >
            {savingId === (itemId ?? 'new') ? 'Saving…' : 'Save item'}
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }} alignItems={{ sm: 'center' }}>
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

      {creating && (
        <Box sx={{ border: 1, borderColor: 'primary.main', borderRadius: 1, p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            New item
          </Typography>
          {renderEditor(newItem, null)}
          <Button size="small" sx={{ mt: 1 }} onClick={() => onCreatingChange(false)}>
            Cancel
          </Button>
        </Box>
      )}

      <Box sx={{ maxHeight: '70vh', overflowY: 'auto', minWidth: 0 }}>
        {sections.map((section) => {
          const categoryItems = items.filter((item) => item.category === section.key);
          // Food always listed; other empty+disabled sections stay hidden.
          if (section.key !== 'food' && categoryItems.length === 0 && !section.enabled) {
            return null;
          }
          return (
            <MenuSectionBlock
              key={section.id}
              section={section}
              items={categoryItems}
              sectionBusyId={sectionBusyId}
              togglingId={togglingId}
              draftFor={draftFor}
              onToggleSection={(s, enabled) => void toggleSectionEnabled(s, enabled)}
              onToggleAvailability={(item, next) => void toggleAvailability(item, next)}
              renderEditor={(draft, itemId) => renderEditor(draft, itemId)}
            />
          );
        })}
      </Box>
    </Box>
  );
}
