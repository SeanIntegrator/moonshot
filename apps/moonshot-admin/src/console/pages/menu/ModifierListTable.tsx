import type { CafeModifierGroup } from '@moonshot/types';
import { Box, Typography } from '@mui/material';
import { COLS_EDIT, COLS_LOCKED, ModifierOptionRow } from './ModifierOptionRow.js';

type Props = {
  group: CafeModifierGroup;
  locked: boolean;
  onChange: (next: CafeModifierGroup) => void;
};

export function ModifierListTable({ group, locked, onChange }: Props) {
  const cols = locked ? COLS_LOCKED : COLS_EDIT;
  const headers = locked
    ? ['OPTION', 'EXTRA', 'DEFAULT', 'KITCHEN LABEL']
    : ['OPTION', 'EXTRA', 'DEFAULT', 'KITCHEN LABEL', ''];

  return (
    <Box>
      <Box
        sx={(theme) => ({
          display: 'grid',
          gridTemplateColumns: cols,
          borderBottom: `1px solid ${theme.console.hairline}`,
        })}
      >
        {headers.map((label, i) => (
          <Box
            key={label || 'remove'}
            sx={(theme) => ({
              px: 2,
              py: 1,
              borderRight: i < headers.length - 1 ? `1px solid ${theme.console.hairline}` : 0,
            })}
          >
            {label ? (
              <Typography
                sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'text.secondary' }}
              >
                {label}
              </Typography>
            ) : null}
          </Box>
        ))}
      </Box>
      {group.options.map((opt) => (
        <ModifierOptionRow
          key={opt.id}
          group={group}
          optionId={opt.id}
          locked={locked}
          canRemove={!locked && group.options.length > 1}
          onChange={onChange}
        />
      ))}
    </Box>
  );
}
