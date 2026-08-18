import type { CafeModifierGroup, NormalisedMenuItem, NormalisedModifierOption } from '@moonshot/types';
import { Box, Button, Typography } from '@mui/material';
import { SourceLabel } from '../../primitives/SourceLabel.js';
import { SaveFooter } from '../../primitives/SaveFooter.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { offeredOnCount, offeredOnLabel } from './item-sidebar.js';
import { ModifierListHeader } from './ModifierListHeader.js';
import { ModifierListTable } from './ModifierListTable.js';

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
  const locked = Boolean(group.posGroupId);
  const dirty = JSON.stringify(group) !== JSON.stringify(original);
  const offered = offeredOnCount(items, group.id);
  const valid = locked || group.options.every((o) => o.name.trim().length > 0);

  return (
    <SettingsCard
      title={group.name || 'Untitled'}
      description={offered > 0 ? offeredOnLabel(offered) : undefined}
      headerAction={
        <ModifierListHeader
          selectionType={group.selectionType}
          required={group.required}
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
          ? 'Change these in Square, then sync.'
          : 'Yours to edit. Change a price here and it changes on every drink that offers it.'}
      </Typography>
      <SaveFooter
        label={saving ? 'Saving…' : 'Save list'}
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
    </SettingsCard>
  );
}
