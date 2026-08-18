import type { CafeModifierGroup } from '@moonshot/types';
import type { DrinkArchetypeDef, DrinkArchetypeId } from '@moonshot/domain';
import { isDrinkArchetypeId } from '@moonshot/domain';
import {
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
import { MenuItemImageField } from '../../../components/menu/MenuItemImageField.js';
import { SizeEditor } from '../../../components/menu/SizeEditor.js';
import { formatGbpMinor } from '../../../lib/format.js';
import { ReadOnlyPanel } from '../../primitives/ReadOnlyPanel.js';
import {
  applyArchetypeToDraft,
  toDraft,
  toggleAttachedGroup,
  type DraftItem,
} from './menu-item-draft.js';

type CategoryOption = { value: string; label: string };

type Props = {
  draft: DraftItem;
  itemId: string | null;
  cafeSlug: string;
  token: string;
  library: CafeModifierGroup[];
  recipes: Record<string, DrinkArchetypeDef>;
  categoryOptions: CategoryOption[];
  priceText: string;
  saving: boolean;
  onPriceText: (raw: string) => void;
  onChange: (next: DraftItem) => void;
  onSaved: (updated: DraftItem) => void;
  onSave: () => void;
};

export function ItemEditorFields({
  draft,
  itemId,
  cafeSlug,
  token,
  library,
  recipes,
  categoryOptions,
  priceText,
  saving,
  onPriceText,
  onChange,
  onSaved,
  onSave,
}: Props) {
  const fromSquare = Boolean(draft.posItemId);
  const selectOptions = categoryOptions.some((c) => c.value === draft.category)
    ? categoryOptions
    : [...categoryOptions, { value: draft.category, label: draft.category }];

  function applyArchetype(value: string) {
    if (!value) {
      onChange(applyArchetypeToDraft(draft, null, null, library));
      return;
    }
    if (!isDrinkArchetypeId(value)) return;
    onChange(applyArchetypeToDraft(draft, value as DrinkArchetypeId, recipes[value] ?? null, library));
  }

  const milkAttached = draft.attachedGroupIds.some((id) => {
    const g = library.find((x) => x.id === id);
    return g?.name === 'Milks' || g?.name === 'Milk';
  });

  return (
    <Stack spacing={2}>
      <FormControl size="small" sx={{ maxWidth: 280 }}>
        <InputLabel>Category</InputLabel>
        <Select
          label="Category"
          value={draft.category}
          onChange={(e) => onChange({ ...draft, category: e.target.value })}
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
          onChange={(e) => applyArchetype(e.target.value)}
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
          {fromSquare ? (
            <ReadOnlyPanel source="square">
              <Typography sx={{ fontWeight: 600 }}>{draft.name}</Typography>
              {draft.description ? (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {draft.description}
                </Typography>
              ) : null}
              {draft.sizes.length === 0 ? (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {formatGbpMinor(draft.priceMinor, draft.currency)}
                </Typography>
              ) : (
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  {draft.sizes
                    .map((s) => `${s.name} ${formatGbpMinor(s.priceMinor, draft.currency)}`)
                    .join(' · ')}
                </Typography>
              )}
            </ReadOnlyPanel>
          ) : (
            <>
              <TextField
                label="Item name"
                size="small"
                required
                fullWidth
                value={draft.name}
                onChange={(e) => onChange({ ...draft, name: e.target.value })}
              />
              <TextField
                label="Description"
                size="small"
                multiline
                minRows={2}
                fullWidth
                value={draft.description ?? ''}
                onChange={(e) => onChange({ ...draft, description: e.target.value || null })}
              />
              {draft.sizes.length === 0 ? (
                <TextField
                  label={`Base price (${draft.currency})`}
                  type="number"
                  size="small"
                  value={priceText}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onPriceText(raw);
                    if (raw.trim() === '') {
                      onChange({ ...draft, priceMinor: 0 });
                      return;
                    }
                    const v = Number.parseFloat(raw);
                    if (Number.isFinite(v)) onChange({ ...draft, priceMinor: Math.round(v * 100) });
                  }}
                  sx={{ maxWidth: 200 }}
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                />
              ) : null}
            </>
          )}
        </Stack>
        <Box sx={{ flex: 1, minWidth: 0, width: { xs: '100%', md: 'auto' } }}>
          <MenuItemImageField
            cafeSlug={cafeSlug}
            token={token}
            itemId={itemId}
            imageUrl={draft.imageUrl}
            imageSource={draft.imageSource ?? null}
            useDefaultImage={draft.useDefaultImage !== false}
            posItemId={draft.posItemId}
            itemName={draft.name || 'Menu item'}
            disabled={saving}
            onUploaded={(updated) => onSaved(toDraft(updated, library))}
          />
        </Box>
      </Box>

      {fromSquare ? null : (
        <SizeEditor
          sizes={draft.sizes}
          currency={draft.currency}
          onChange={(sizes) => onChange({ ...draft, sizes })}
        />
      )}

      {library.length > 0 ? (
        <Box>
          <Typography variant="subtitle2" gutterBottom>
            Modifier sections on this item
          </Typography>
          <FormGroup>
            {library.map((g) => (
              <FormControlLabel
                key={g.id}
                control={
                  <Checkbox
                    checked={draft.attachedGroupIds.includes(g.id)}
                    onChange={() => onChange(toggleAttachedGroup(draft, g.id))}
                  />
                }
                label={`${g.name} (${g.selectionType}${g.required ? ', required' : ''})`}
              />
            ))}
          </FormGroup>
          {milkAttached ? (
            <>
              <FormControlLabel
                sx={{ mt: 1 }}
                control={
                  <Switch
                    checked={draft.waiveMilkSurcharge}
                    onChange={(e) => onChange({ ...draft, waiveMilkSurcharge: e.target.checked })}
                  />
                }
                label="Waive alt-milk surcharge on this item"
              />
              {(draft.archetype === 'low-milk-hot' ||
                draft.archetype === 'low-milk-iced' ||
                draft.archetype === 'tea') && (
                <FormControlLabel
                  control={
                    <Switch
                      checked={draft.allowNoMilk}
                      onChange={(e) => onChange({ ...draft, allowNoMilk: e.target.checked })}
                    />
                  }
                  label="Allow no milk (black americano / tea)"
                />
              )}
            </>
          ) : null}
        </Box>
      ) : null}

      <Button variant="contained" size="small" disabled={!draft.name.trim() || saving} onClick={onSave}>
        {saving ? 'Saving…' : 'Save item'}
      </Button>
    </Stack>
  );
}
