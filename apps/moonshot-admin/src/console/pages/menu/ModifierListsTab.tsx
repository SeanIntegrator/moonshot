import type { CafeModifierGroup, ModifierFamily, NormalisedMenuItem } from '@moonshot/types';
import { Box, Stack, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { updateModifierGroup } from '../../../lib/admin-api.js';
import { useToast } from '../../primitives/ToastProvider.js';
import { listsForFamilyTab } from './item-sidebar.js';
import { ModifierListCard } from './ModifierListCard.js';

type Props = {
  cafeSlug: string;
  token: string;
  family: ModifierFamily;
  groups: CafeModifierGroup[];
  items: NormalisedMenuItem[];
  onLibraryChanged: () => void;
};

export function ModifierListsTab({ cafeSlug, token, family, groups, items, onLibraryChanged }: Props) {
  const toast = useToast();
  const [drafts, setDrafts] = useState<Record<string, CafeModifierGroup>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const visible = useMemo(
    () => listsForFamilyTab(groups, drafts, family),
    [groups, drafts, family],
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
        slot: group.slot,
      });
      setDrafts((prev) => ({ ...prev, [updated.id]: updated }));
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
