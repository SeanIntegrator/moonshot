import type { CafeModifierGroup, NormalisedMenuItem, NormalisedModifierOption } from '@moonshot/types';
import { Box, Button, Typography } from '@mui/material';
import { SourceLabel } from '../../primitives/SourceLabel.js';
import { SaveFooter } from '../../primitives/SaveFooter.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { offeredOnCount, offeredOnLabel } from './item-sidebar.js';
import { isPosOwnedGroup } from './modifier-list-copy.js';
import { ModifierListHeader } from './ModifierListHeader.js';
import { ModifierListTable } from './ModifierListTable.js';
import { ModifierSlotSelect, familyLabelForSlot } from './ModifierSlotSelect.js';

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
    (locked || group.options.every((o) => o.name.trim().length > 0)) && group.slot !== undefined;

  return (
    <SettingsCard
      title={group.name || 'Untitled'}
      description={
        offered > 0
          ? `${offeredOnLabel(offered)} · ${familyLabelForSlot(group.slot)}`
          : familyLabelForSlot(group.slot)
      }
      headerAction={
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
          <ModifierSlotSelect
            value={group.slot}
            onChange={(slot) => onChange({ ...group, slot })}
          />
          <ModifierListHeader
          selectionType={group.selectionType}
          required={group.required}
          locked={locked}
          onSelectionType={(selectionType) => {
            if (selectionType === 'single') {
              const firstDefault = group.options.find((o) => o.isDefault) ?? group.options[0];
              onChange({
                ...group,
                selectionType,
                options: group.options.map((o) => ({
                  ...o,
                  isDefault: firstDefault ? o.id === firstDefault.id : o.isDefault,
                })),
              });
              return;
            }
            onChange({ ...group, selectionType });
          }}
          onRequired={(required) => onChange({ ...group, required })}
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
      <Box sx={{ mx: { xs: -2, sm: -3 } }}>
        <ModifierListTable group={group} locked={locked} onChange={onChange} />
      </Box>
      <Typography variant="body2" sx={{ mt: 2 }}>
        {locked
          ? 'Options sync from Square. Set the list type here so Moonshot knows how to group it.'
          : 'Yours to edit. Change a price here and it changes on every drink that offers it.'}
      </Typography>
      {dirty ? (
        <SaveFooter
          label={saving ? 'Saving…' : locked ? 'Save list type' : 'Save list'}
          dirty={dirty}
          valid={valid}
          saving={saving}
          onSave={onSave}
          start={
            locked ? undefined : (
              <Button
                variant="outlined"
                size="small"
                onClick={() => onChange({ ...group, options: [...group.options, newOption()] })}
              >
                + Add an option
              </Button>
            )
          }
        />
      ) : locked ? null : (
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => onChange({ ...group, options: [...group.options, newOption()] })}
          >
            + Add an option
          </Button>
        </Box>
      )}
    </SettingsCard>
  );
}
