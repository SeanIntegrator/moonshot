import type { CafeModifierGroup, MenuCategory, NormalisedMenuItem } from '@moonshot/types';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
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
import { useState } from 'react';
import {
  createMenuItem,
  deleteMenuItem,
  patchMenuItem,
} from '../../lib/admin-api.js';
import { formatGbpMinor } from '../../lib/format.js';
import { MenuItemImageField } from './MenuItemImageField.js';
import { SizeEditor } from './SizeEditor.js';

const CATEGORIES: { value: MenuCategory; label: string }[] = [
  { value: 'hot_drinks', label: 'Hot drinks' },
  { value: 'cold_drinks', label: 'Cold drinks' },
  { value: 'food', label: 'Food' },
  { value: 'extras', label: 'Extras' },
];

const SUBCATEGORY_SUGGESTIONS = [
  'coffee',
  'matcha',
  'tea',
  'chocolate',
  'pastries',
  'breakfast',
  'lunch',
  'snacks',
];

type DraftItem = NormalisedMenuItem & { attachedGroupIds: string[] };

function toDraft(item: NormalisedMenuItem, library: CafeModifierGroup[]): DraftItem {
  const libraryIds = new Set(library.map((g) => g.id));
  return {
    ...structuredClone(item),
    sizes: item.sizes ?? [],
    attachedGroupIds: item.modifierGroups.filter((g) => libraryIds.has(g.id)).map((g) => g.id),
  };
}

function emptyDraft(): DraftItem {
  return {
    id: '',
    posItemId: null,
    name: '',
    description: null,
    priceMinor: 0,
    currency: 'GBP',
    category: 'hot_drinks',
    subcategory: null,
    imageUrl: null,
    emoji: null,
    isAvailable: true,
    sizes: [],
    modifierGroups: [],
    tags: [],
    attachedGroupIds: [],
  };
}

type Props = {
  cafeSlug: string;
  token: string;
  items: NormalisedMenuItem[];
  library: CafeModifierGroup[];
  onItemsChanged: () => void;
};

export function MenuItemsPanel({ cafeSlug, token, items, library, onItemsChanged }: Props) {
  const [drafts, setDrafts] = useState<Record<string, DraftItem>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newItem, setNewItem] = useState<DraftItem>(emptyDraft);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
      setCreating(false);
      setNewItem(emptyDraft());
      onItemsChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSavingId(null);
    }
  }

  async function hideItem(itemId: string) {
    if (!window.confirm('Hide this item from the order-ahead app?')) return;
    try {
      await deleteMenuItem(token, cafeSlug, itemId);
      onItemsChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  }

  function renderEditor(draft: DraftItem, itemId: string | null) {
    const key = itemId ?? 'new';
    const update = (patch: Partial<DraftItem>) => {
      if (itemId) setDraft(itemId, { ...draft, ...patch });
      else setNewItem({ ...draft, ...patch });
    };

    return (
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Item name"
            size="small"
            required
            value={draft.name}
            onChange={(e) => update({ name: e.target.value })}
            sx={{ flex: 1 }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Category</InputLabel>
            <Select
              label="Category"
              value={draft.category}
              onChange={(e) => update({ category: e.target.value as MenuCategory })}
            >
              {CATEGORIES.map((c) => (
                <MenuItem key={c.value} value={c.value}>
                  {c.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        <TextField
          label="Secondary category"
          size="small"
          value={draft.subcategory ?? ''}
          onChange={(e) => update({ subcategory: e.target.value || null })}
          helperText={`e.g. ${SUBCATEGORY_SUGGESTIONS.slice(0, 4).join(', ')}`}
        />

        <TextField
          label="Description"
          size="small"
          multiline
          minRows={2}
          value={draft.description ?? ''}
          onChange={(e) => update({ description: e.target.value || null })}
        />

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

        {draft.sizes.length === 0 && (
          <TextField
            label={`Base price (${draft.currency})`}
            type="number"
            size="small"
            value={draft.priceMinor / 100}
            onChange={(e) => {
              const v = Number.parseFloat(e.target.value);
              if (Number.isFinite(v)) update({ priceMinor: Math.round(v * 100) });
            }}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ maxWidth: 200 }}
          />
        )}

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
          </Box>
        )}

        <FormControlLabel
          control={
            <Switch
              checked={draft.isAvailable}
              onChange={(_, v) => update({ isAvailable: v })}
            />
          }
          label="Orderable on app"
        />

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            size="small"
            disabled={!draft.name.trim() || savingId === (itemId ?? 'new')}
            onClick={() => void saveItem(draft)}
          >
            {savingId === (itemId ?? 'new') ? 'Saving…' : 'Save item'}
          </Button>
          {itemId && (
            <Button size="small" color="error" onClick={() => void hideItem(itemId)}>
              Hide from menu
            </Button>
          )}
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

      {creating && (
        <Box sx={{ border: 1, borderColor: 'primary.main', borderRadius: 1, p: 2, mb: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            New item
          </Typography>
          {renderEditor(newItem, null)}
        <Button size="small" sx={{ mt: 1 }} onClick={() => setCreating(false)}>
          Cancel
        </Button>
      </Box>
      )}

      {!creating && (
        <Button sx={{ mb: 2 }} onClick={() => setCreating(true)}>
          Add item
        </Button>
      )}

      <Stack spacing={1}>
        {items.map((item) => {
          const draft = draftFor(item);
          const displayPrice =
            draft.sizes.length > 0
              ? `from ${formatGbpMinor(Math.min(...draft.sizes.map((s) => s.priceMinor)), draft.currency)}`
              : formatGbpMinor(draft.priceMinor, draft.currency);
          return (
            <Accordion key={item.id} disableGutters>
              <AccordionSummary>
                <Stack direction="row" spacing={2} alignItems="center" sx={{ width: '100%', pr: 1 }}>
                  <Typography sx={{ flex: 1 }}>{item.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {displayPrice}
                  </Typography>
                  <Typography variant="caption" color={item.isAvailable ? 'success.main' : 'text.disabled'}>
                    {item.isAvailable ? 'On menu' : 'Hidden'}
                  </Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>{renderEditor(draft, item.id)}</AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>

      {items.length === 0 && !creating && (
        <Typography color="text.secondary">No menu items yet. Add your first item above.</Typography>
      )}
    </Box>
  );
}
