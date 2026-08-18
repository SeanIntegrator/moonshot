import type { CafeModifierGroup, NormalisedMenuItem } from '@moonshot/types';
import { Box, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { updateModifierGroup } from '../../../lib/admin-api.js';
import { useToast } from '../../primitives/ToastProvider.js';
import { classifyModifierChip } from './modifier-chips.js';
import { ModifierListCard } from './ModifierListCard.js';

type Chip = ReturnType<typeof classifyModifierChip>;

type Props = {
  cafeSlug: string;
  token: string;
  chip: Chip;
  groups: CafeModifierGroup[];
  items: NormalisedMenuItem[];
  onLibraryChanged: () => void;
};

export function ModifierListsTab({ cafeSlug, token, chip, groups, items, onLibraryChanged }: Props) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, CafeModifierGroup>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const visible = useMemo(
    () =>
      groups
        .map((g) => drafts[g.id] ?? g)
        .filter((g) => classifyModifierChip(g.name) === chip),
    [groups, drafts, chip],
  );

  function setDraft(group: CafeModifierGroup) {
    setDrafts((prev) => ({ ...prev, [group.id]: group }));
  }

  async function saveGroup(group: CafeModifierGroup) {
    setSavingId(group.id);
    try {
      const updated = await updateModifierGroup(token, cafeSlug, group.id, {
        name: group.name,
        selectionType: group.selectionType,
        required: group.required,
        maxSelect: group.maxSelect,
        options: group.options,
        sortOrder: group.sortOrder,
      });
      setDraft(updated);
      toast({ severity: 'success', message: `Saved “${updated.name}”.` });
      onLibraryChanged();
    } catch (e) {
      toast({ severity: 'error', message: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <Box>
      <Stack spacing={2}>
        {visible.length === 0 ? (
          <Typography variant="body2">No lists in this tab yet.</Typography>
        ) : null}
        {visible.map((group) => (
          <ModifierListCard
            key={group.id}
            group={group}
            original={groups.find((g) => g.id === group.id)}
            items={items}
            saving={savingId === group.id}
            onChange={setDraft}
            onSave={() => void saveGroup(group)}
          />
        ))}
      </Stack>
    </Box>
  );
}
