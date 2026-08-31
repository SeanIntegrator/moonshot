import type { CafeModifierGroup } from '@moonshot/types';
import type { DrinkArchetypeDef } from '@moonshot/domain';
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
import { choiceMetaLine, isPosOwnedGroup } from './modifier-list-copy.js';
import {
  archetypeIdForOwnerTemplate,
  OWNER_RECIPE_TEMPLATES,
  ownerTemplateFromArchetype,
  type OwnerRecipeTemplateId,
} from './recipe-templates.js';

type Props = {
  draft: DraftItem;
  library: CafeModifierGroup[];
  recipes: Record<string, DrinkArchetypeDef>;
  onChange: (next: DraftItem) => void;
};

export function ItemChoicesCard({ draft, library, recipes, onChange }: Props) {
  function applyOwnerTemplate(templateId: OwnerRecipeTemplateId) {
    const archetypeId = archetypeIdForOwnerTemplate(templateId);
    const recipe = recipes[archetypeId];
    // Recipes load async; a missing lookup must not be treated as "none" or save would wipe the archetype.
    if (!recipe) return;
    onChange(applyArchetypeToDraft(draft, archetypeId, recipe, library));
  }

  const milkGroup = library.find((g) => g.slot === 'milk');
  const milkAttached = milkGroup ? draft.attachedGroupIds.includes(milkGroup.id) : false;
  const hasSquareLists = library.some(isPosOwnedGroup);
  const selectedTemplate = ownerTemplateFromArchetype(draft.archetype);
  const recipesReady = Object.keys(recipes).length > 0;

  return (
    <Box
      sx={(theme) => ({
        bgcolor: theme.console.card.bg,
        border: `1px solid ${theme.console.card.border}`,
        borderRadius: `${theme.console.card.radiusPx}px`,
        p: { xs: 2, sm: 2.5 },
      })}
    >
      <Typography variant="h3" component="h2" sx={{ mb: hasSquareLists ? 0.75 : 2 }}>
        Choices on this drink
      </Typography>
      {hasSquareLists ? (
        <Typography variant="body2" sx={{ mb: 2 }}>
          Square lists stay attached as they are in Square. Change those there, then sync.
        </Typography>
      ) : null}
      <FormControl size="small" fullWidth sx={{ mb: 2 }}>
        <InputLabel>Recipe template</InputLabel>
        <Select
          label="Recipe template"
          value={selectedTemplate}
          disabled={!recipesReady}
          onChange={(e) => applyOwnerTemplate(e.target.value as OwnerRecipeTemplateId)}
        >
          {OWNER_RECIPE_TEMPLATES.map((t) => (
            <MenuItem key={t.id} value={t.id}>
              {t.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      {library.map((g) => {
        const attached = draft.attachedGroupIds.includes(g.id);
        const isMilk = milkGroup?.id === g.id;
        const fromSquare = isPosOwnedGroup(g);
        return (
          <Box key={g.id}>
            <Box
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
                <Typography variant="body2">{choiceMetaLine(g)}</Typography>
              </Box>
              <Switch
                checked={attached}
                disabled={fromSquare}
                onChange={() => onChange(toggleAttachedGroup(draft, g.id, library))}
                slotProps={{ input: { 'aria-label': `Offer ${g.name}` } }}
              />
            </Box>
            {isMilk && attached ? (
              <FormControlLabel
                sx={{ display: 'flex', ml: 0, mb: 1, alignItems: 'flex-start' }}
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
