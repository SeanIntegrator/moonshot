import type { CafeMenuSection, CafeModifierGroup } from '@moonshot/types';
import type { DrinkArchetypeDef } from '@moonshot/domain';
import { Box, Button, FormControlLabel, Switch, Typography } from '@mui/material';
import { useState } from 'react';
import { switchLoader } from '../../primitives/button-loader.js';
import { SaveFooter } from '../../primitives/SaveFooter.js';
import { DeleteItemDialog } from './DeleteItemDialog.js';
import { ItemChoicesCard } from './ItemChoicesCard.js';
import { ItemDetailsCard } from './ItemDetailsCard.js';
import { isFeaturedItem, isFoodItem } from './item-sidebar.js';
import type { DraftItem } from './menu-item-draft.js';
import { ownerTemplateLabelForArchetype } from './recipe-templates.js';

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
  deleting?: boolean;
  dirty: boolean;
  valid: boolean;
  onChange: (next: DraftItem) => void;
  onSaved: (updated: DraftItem) => void;
  onSave: () => void;
  onUndo: () => void;
  onDelete?: () => void | Promise<boolean | void>;
  onPendingImage?: (file: File) => void;
  onToggleMenu?: (next: boolean) => void;
  categoryRequired?: boolean;
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
  deleting = false,
  dirty,
  valid,
  onChange,
  onSaved,
  onSave,
  onUndo,
  onDelete,
  onPendingImage,
  onToggleMenu,
  categoryRequired = false,
}: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const sectionLabel = sections.find((s) => s.key === draft.category)?.label ?? draft.category;
  const recipeLabel = ownerTemplateLabelForArchetype(draft.archetype);
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
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            <SaveFooter
              variant="inline"
              label="Save item"
              dirty={dirty}
              valid={valid}
              saving={saving}
              onSave={onSave}
              secondaryLabel="Undo changes"
              secondaryVariant="outlined"
              onSecondary={onUndo}
            />
            {itemId && onDelete ? (
              <Button
                variant="outlined"
                color="error"
                disabled={saving || deleting}
                onClick={() => setDeleteOpen(true)}
              >
                Hide item
              </Button>
            ) : null}
          </Box>
          <FormControlLabel
            sx={{ mr: 0 }}
            control={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
                <Switch
                  checked={draft.isAvailable}
                  disabled={toggling || !itemId || !onToggleMenu}
                  onChange={(_, v) => onToggleMenu?.(v)}
                />
                {switchLoader(toggling)}
              </Box>
            }
            label="On the menu"
          />
        </Box>
      </Box>
      <ItemDetailsCard
        draft={draft}
        itemId={itemId}
        cafeSlug={cafeSlug}
        token={token}
        library={library}
        categoryOptions={categoryOptions}
        categoryRequired={categoryRequired}
        saving={saving}
        onChange={onChange}
        onSaved={onSaved}
        onPendingImage={onPendingImage}
      />
      {library.length > 0 && !isFoodItem(draft, sections) ? (
        <ItemChoicesCard draft={draft} library={library} recipes={recipes} onChange={onChange} />
      ) : null}
      {itemId && onDelete ? (
        <DeleteItemDialog
          open={deleteOpen}
          busy={deleting}
          itemName={draft.name}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => {
            void (async () => {
              const result = await onDelete();
              if (result !== false) setDeleteOpen(false);
            })();
          }}
        />
      ) : null}
    </Box>
  );
}
