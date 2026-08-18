import type { CafeMenuSection, CafeModifierGroup } from '@moonshot/types';
import type { DrinkArchetypeDef } from '@moonshot/domain';
import { Box, FormControlLabel, Switch, Typography } from '@mui/material';
import { ItemChoicesCard } from './ItemChoicesCard.js';
import { ItemDetailsCard } from './ItemDetailsCard.js';
import { isFeaturedItem } from './item-sidebar.js';
import type { DraftItem } from './menu-item-draft.js';

type CategoryOption = { value: string; label: string };

type Props = {
  draft: DraftItem;
  itemId: string | null;
  cafeSlug: string;
  token: string;
  library: CafeModifierGroup[];
  recipes: Record<string, DrinkArchetypeDef>;
  sections: CafeMenuSection[];
  categoryOptions: CategoryOption[];
  saving: boolean;
  toggling: boolean;
  onChange: (next: DraftItem) => void;
  onSaved: (updated: DraftItem) => void;
  onToggleMenu: (next: boolean) => void;
};

export function ItemEditorFields({
  draft,
  itemId,
  cafeSlug,
  token,
  library,
  recipes,
  sections,
  categoryOptions,
  saving,
  toggling,
  onChange,
  onSaved,
  onToggleMenu,
}: Props) {
  const sectionLabel = sections.find((s) => s.key === draft.category)?.label ?? draft.category;
  const recipeLabel = draft.archetype ? (recipes[draft.archetype]?.label ?? draft.archetype) : null;
  const sizeCount = draft.sizes.length;
  const featured = isFeaturedItem(draft);
  const crumb = [
    sectionLabel,
    recipeLabel,
    sizeCount > 0 ? `${sizeCount} size${sizeCount === 1 ? '' : 's'}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 2,
          flexWrap: 'wrap',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="h2" component="h2">
              {draft.name || 'Untitled'}
            </Typography>
            {featured ? (
              <Box
                sx={(theme) => ({
                  px: 1,
                  py: 0.15,
                  borderRadius: 999,
                  bgcolor: theme.console.stock.inFill,
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.console.muted,
                })}
              >
                Featured
              </Box>
            ) : null}
          </Box>
          {crumb ? (
            <Typography variant="body2" sx={{ mt: 0.5 }}>
              {crumb}
            </Typography>
          ) : null}
        </Box>
        <FormControlLabel
          sx={{ mr: 0 }}
          control={
            <Switch
              checked={draft.isAvailable}
              disabled={toggling || !itemId}
              onChange={(_, v) => onToggleMenu(v)}
            />
          }
          label="On the menu"
        />
      </Box>
      <ItemDetailsCard
        draft={draft}
        itemId={itemId}
        cafeSlug={cafeSlug}
        token={token}
        library={library}
        categoryOptions={categoryOptions}
        saving={saving}
        onChange={onChange}
        onSaved={onSaved}
      />
      {library.length > 0 ? (
        <ItemChoicesCard draft={draft} library={library} recipes={recipes} onChange={onChange} />
      ) : null}
    </Box>
  );
}
