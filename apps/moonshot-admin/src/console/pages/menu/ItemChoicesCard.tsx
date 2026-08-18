import type { CafeModifierGroup } from '@moonshot/types';
import type { DrinkArchetypeDef, DrinkArchetypeId } from '@moonshot/domain';
import { isDrinkArchetypeId } from '@moonshot/domain';
import {
  Box,
  Checkbox,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  Typography,
} from '@mui/material';
import { applyArchetypeToDraft, toggleAttachedGroup, type DraftItem } from './menu-item-draft.js';

type Props = {
  draft: DraftItem;
  library: CafeModifierGroup[];
  recipes: Record<string, DrinkArchetypeDef>;
  onChange: (next: DraftItem) => void;
};

export function ItemChoicesCard({ draft, library, recipes, onChange }: Props) {
  function applyArchetype(value: string) {
    if (!value) {
      onChange(applyArchetypeToDraft(draft, null, null, library));
      return;
    }
    if (!isDrinkArchetypeId(value)) return;
    onChange(applyArchetypeToDraft(draft, value as DrinkArchetypeId, recipes[value] ?? null, library));
  }

  const milkGroup = library.find((g) => g.name === 'Milks' || g.name === 'Milk');
  const milkAttached = milkGroup ? draft.attachedGroupIds.includes(milkGroup.id) : false;

  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.console.card.border}`,
        borderRadius: `${theme.console.card.radiusPx}px`,
        p: { xs: 2, sm: 2.5 },
      })}
    >
      <Typography variant="h3" component="h2" sx={{ mb: 2 }}>
        Choices on this drink
      </Typography>
      {Object.keys(recipes).length > 0 ? (
        <FormControl size="small" sx={{ maxWidth: 320, mb: 2, display: 'block' }}>
          <InputLabel>Recipe</InputLabel>
          <Select
            label="Recipe"
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
      ) : null}
      {library.map((g) => {
        const attached = draft.attachedGroupIds.includes(g.id);
        const isMilk = milkGroup?.id === g.id;
        return (
          <Box
            key={g.id}
            sx={(theme) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              py: 1.25,
              borderTop: `1px solid ${theme.console.hairline}`,
            })}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600 }}>{g.name}</Typography>
              <Typography variant="body2">
                {g.selectionType === 'single' ? 'Pick one' : 'Any number'}
                {g.required ? ' · required' : ''}
              </Typography>
            </Box>
            {isMilk && attached ? (
              <FormControlLabel
                sx={{ mr: 1 }}
                control={
                  <Checkbox
                    size="small"
                    checked={draft.waiveMilkSurcharge}
                    onChange={(e) => onChange({ ...draft, waiveMilkSurcharge: e.target.checked })}
                  />
                }
                label="Don't charge customers for alternative milks on this item"
              />
            ) : null}
            <Switch
              checked={attached}
              onChange={() => onChange(toggleAttachedGroup(draft, g.id))}
              slotProps={{ input: { 'aria-label': `Offer ${g.name}` } }}
            />
          </Box>
        );
      })}
      {milkAttached &&
      (draft.archetype === 'low-milk-hot' ||
        draft.archetype === 'low-milk-iced' ||
        draft.archetype === 'tea') ? (
        <FormControlLabel
          sx={{ mt: 1 }}
          control={
            <Switch
              checked={draft.allowNoMilk}
              onChange={(e) => onChange({ ...draft, allowNoMilk: e.target.checked })}
            />
          }
          label="Allow no milk (black americano / tea)"
        />
      ) : null}
    </Box>
  );
}
