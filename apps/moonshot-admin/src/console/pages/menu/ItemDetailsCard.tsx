import type { CafeModifierGroup } from '@moonshot/types';
import { Box, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { MenuItemImageField } from '../../../components/menu/MenuItemImageField.js';
import { SizeEditor } from '../../../components/menu/SizeEditor.js';
import { formatGbpMinor } from '../../../lib/format.js';
import { ReadOnlyPanel } from '../../primitives/ReadOnlyPanel.js';
import { toDraft, type DraftItem } from './menu-item-draft.js';

type CategoryOption = { value: string; label: string };

type Props = {
  draft: DraftItem;
  itemId: string | null;
  cafeSlug: string;
  token: string;
  library: CafeModifierGroup[];
  categoryOptions: CategoryOption[];
  priceText: string;
  saving: boolean;
  onPriceText: (raw: string) => void;
  onChange: (next: DraftItem) => void;
  onSaved: (updated: DraftItem) => void;
};

export function ItemDetailsCard({
  draft,
  itemId,
  cafeSlug,
  token,
  library,
  categoryOptions,
  priceText,
  saving,
  onPriceText,
  onChange,
  onSaved,
}: Props) {
  const fromSquare = Boolean(draft.posItemId);
  const selectOptions = categoryOptions.some((c) => c.value === draft.category)
    ? categoryOptions
    : [...categoryOptions, { value: draft.category, label: draft.category }];
  const sizeLine =
    draft.sizes.length === 0
      ? formatGbpMinor(draft.priceMinor, draft.currency)
      : draft.sizes
          .map(
            (s) =>
              `${s.name} ${formatGbpMinor(s.priceMinor, draft.currency)}${s.isDefault ? ' (default)' : ''}`,
          )
          .join(' · ');

  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.console.card.border}`,
        borderRadius: `${theme.console.card.radiusPx}px`,
        p: { xs: 2, sm: 2.5 },
      })}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: 2.5,
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ width: { xs: '100%', sm: 160 }, flex: '0 0 auto' }}>
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
            square
            hideLabel
            onUploaded={(updated) => onSaved(toDraft(updated, library))}
          />
        </Box>
        <Stack spacing={1.5} sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          {fromSquare ? (
            <ReadOnlyPanel source="square" helper="Change these in Square, then sync.">
              <Stack spacing={1.25}>
                <Box>
                  <Typography variant="caption">Name</Typography>
                  <Typography sx={{ fontWeight: 600 }}>{draft.name}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption">Description</Typography>
                  <Typography>{draft.description || '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="caption">Sizes and prices</Typography>
                  <Typography>{sizeLine}</Typography>
                </Box>
              </Stack>
            </ReadOnlyPanel>
          ) : (
            <>
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
              ) : (
                <SizeEditor
                  sizes={draft.sizes}
                  currency={draft.currency}
                  onChange={(sizes) => onChange({ ...draft, sizes })}
                />
              )}
            </>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
