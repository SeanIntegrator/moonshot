import type { CafeModifierGroup } from '@moonshot/types';
import { Box, Typography } from '@mui/material';
import { AllowMultipleSelectionsToggle } from './ModifierListHeader.js';
import {
  DEFAULT_COL_WIDTH,
  DELETE_COL_WIDTH,
  EXTRA_COL_WIDTH,
  ModifierOptionRow,
  SWATCH_COL_WIDTH,
} from './ModifierOptionRow.js';
import { ensureDefaultOption } from './modifier-option-draft.js';

type Props = {
  group: CafeModifierGroup;
  locked: boolean;
  onChange: (next: CafeModifierGroup) => void;
};

function headerLabel(text: string) {
  return (
    <Typography
      sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'text.secondary' }}
    >
      {text}
    </Typography>
  );
}

export function ModifierListTable({ group, locked, onChange }: Props) {
  const showMilkSwatch = group.slot === 'milk';

  function handleSelectionType(selectionType: CafeModifierGroup['selectionType']) {
    if (selectionType === 'single') {
      const firstDefault = group.options.find((o) => o.isDefault) ?? group.options[0];
      onChange(
        ensureDefaultOption({
          ...group,
          selectionType,
          options: group.options.map((o) => ({
            ...o,
            isDefault: firstDefault ? o.id === firstDefault.id : o.isDefault,
          })),
        }),
      );
      return;
    }
    onChange({ ...group, selectionType });
  }

  return (
    <Box>
      <Box
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: { xs: 2, sm: 3 },
          py: 1,
          borderBottom: `1px solid ${theme.console.hairline}`,
        })}
      >
        {showMilkSwatch ? <Box sx={{ flex: `0 0 ${SWATCH_COL_WIDTH}px` }} /> : null}
        <Box sx={{ flex: '1 1 160px', minWidth: 0 }}>{headerLabel('OPTION')}</Box>
        <Box sx={{ flex: `0 0 ${EXTRA_COL_WIDTH}px` }}>{headerLabel('EXTRA')}</Box>
        <Box
          sx={{
            flex: `0 0 ${DEFAULT_COL_WIDTH}px`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0.75,
          }}
        >
          {headerLabel('DEFAULT')}
          <AllowMultipleSelectionsToggle
            selectionType={group.selectionType}
            locked={locked}
            onSelectionType={handleSelectionType}
          />
        </Box>
        {!locked ? <Box sx={{ flex: `0 0 ${DELETE_COL_WIDTH}px` }} /> : null}
      </Box>
      {group.options.map((opt) => (
        <ModifierOptionRow
          key={opt.id}
          group={group}
          optionId={opt.id}
          locked={locked}
          showMilkSwatch={showMilkSwatch}
          canRemove={!locked && group.options.length > 1}
          onChange={onChange}
        />
      ))}
    </Box>
  );
}
