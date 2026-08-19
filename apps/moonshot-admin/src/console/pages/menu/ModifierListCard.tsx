import type { CafeModifierGroup, NormalisedMenuItem, NormalisedModifierOption } from '@moonshot/types';
import { Box, Button, Typography } from '@mui/material';
import { SourceLabel } from '../../primitives/SourceLabel.js';
import { SaveFooter } from '../../primitives/SaveFooter.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { offeredOnCount, offeredOnLabel } from './item-sidebar.js';
import { isPosOwnedGroup } from './modifier-list-copy.js';
import { RequiredChoiceToggle } from './ModifierListHeader.js';
import { ModifierListTable } from './ModifierListTable.js';
import { familyLabelForSlot } from './ModifierSlotSelect.js';
import { addOption, groupHasValidDefaults, setRequired } from './modifier-option-draft.js';

function newOption(): NormalisedModifierOption {
  return {
    id: crypto.randomUUID(),
    posOptionId: null,
    name: '',
    priceMinor: 0,
    isDefault: false,
    colorHex: '#e8e8e8',
    chipLabel: '',
  };
}

type Props = {
  group: CafeModifierGroup;
  original: CafeModifierGroup | undefined;
  items: NormalisedMenuItem[];
  saving: boolean;
  onChange: (next: CafeModifierGroup) => void;
  onSave: () => void;
};

export function ModifierListCard({ group, original, items, saving, onChange, onSave }: Props) {
  const locked = isPosOwnedGroup(group);
  const dirty = JSON.stringify(group) !== JSON.stringify(original);
  const offered = offeredOnCount(items, group.id);
  const valid =
    group.slot !== undefined &&
    groupHasValidDefaults(group) &&
    (locked || group.options.every((o) => o.name.trim().length > 0));

  return (
    <SettingsCard
      title={group.name || 'Untitled'}
      description={
        offered > 0
          ? `${offeredOnLabel(offered)} · ${familyLabelForSlot(group.slot)}`
          : familyLabelForSlot(group.slot)
      }
      headerAction={
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            flexWrap: 'wrap',
            justifyContent: 'flex-end',
          }}
        >
          <RequiredChoiceToggle
            required={group.required}
            locked={locked}
            onRequired={(required) => onChange(setRequired(group, required))}
          />
          <SaveFooter
            variant="inline"
            label={saving ? 'Saving…' : 'Save list'}
            dirty={dirty}
            valid={valid}
            saving={saving}
            onSave={onSave}
          />
        </Box>
      }
    >
      {locked ? (
        <Box
          sx={(theme) => ({
            mx: { xs: -2, sm: -3 },
            px: { xs: 2, sm: 3 },
            py: 1,
            bgcolor: theme.console.readonly.fill,
            borderTop: `1px solid ${theme.console.readonly.border}`,
            borderBottom: `1px solid ${theme.console.readonly.border}`,
          })}
        >
          <SourceLabel kind="square" />
        </Box>
      ) : null}
      {locked ? (
        <Typography variant="body2" sx={{ mt: 2, mb: 0.5 }}>
          Options sync from Square.
        </Typography>
      ) : null}
      <Box sx={{ mx: { xs: -2, sm: -3 } }}>
        <ModifierListTable group={group} locked={locked} onChange={onChange} />
      </Box>
      {!locked ? (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onChange(addOption(group, newOption()))}
          >
            + Add an option
          </Button>
        </Box>
      ) : null}
    </SettingsCard>
  );
}
