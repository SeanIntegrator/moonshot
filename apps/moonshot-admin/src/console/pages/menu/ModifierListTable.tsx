import type { CafeModifierGroup, NormalisedModifierOption } from '@moonshot/types';
import { Box, InputAdornment, Radio, Switch, TextField, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { formatExtraMinor, poundsToMinor } from './extra-price.js';
import { KitchenLabelCell } from './KitchenLabelCell.js';

const COLS = 'minmax(140px, 1.4fr) minmax(88px, 0.7fr) minmax(88px, 0.6fr) minmax(120px, 0.9fr)';

type Props = {
  group: CafeModifierGroup;
  locked: boolean;
  onChange: (next: CafeModifierGroup) => void;
};

function updateOption(
  group: CafeModifierGroup,
  optionId: string,
  patch: Partial<NormalisedModifierOption>,
): CafeModifierGroup {
  return {
    ...group,
    options: group.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o)),
  };
}

function setDefault(group: CafeModifierGroup, optionId: string, on: boolean): CafeModifierGroup {
  if (group.selectionType === 'single') {
    return {
      ...group,
      options: group.options.map((o) => ({ ...o, isDefault: o.id === optionId })),
    };
  }
  return updateOption(group, optionId, { isDefault: on });
}

function Cell({ children, divider }: { children: ReactNode; divider?: boolean }) {
  return (
    <Box
      sx={(theme) => ({
        px: 2,
        py: 2.1,
        display: 'flex',
        alignItems: 'center',
        borderRight: divider ? `1px solid ${theme.console.hairline}` : 0,
        minWidth: 0,
      })}
    >
      {children}
    </Box>
  );
}

export function ModifierListTable({ group, locked, onChange }: Props) {
  return (
    <Box>
      <Box
        sx={(theme) => ({
          display: 'grid',
          gridTemplateColumns: COLS,
          borderBottom: `1px solid ${theme.console.hairline}`,
        })}
      >
        {['OPTION', 'EXTRA', 'DEFAULT', 'KITCHEN LABEL'].map((label, i) => (
          <Box
            key={label}
            sx={(theme) => ({
              px: 2,
              py: 1,
              borderRight: i < 3 ? `1px solid ${theme.console.hairline}` : 0,
            })}
          >
            <Typography
              sx={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', color: 'text.secondary' }}
            >
              {label}
            </Typography>
          </Box>
        ))}
      </Box>
      {group.options.map((opt) => (
        <Box
          key={opt.id}
          sx={(theme) => ({
            display: 'grid',
            gridTemplateColumns: COLS,
            borderBottom: `1px solid ${theme.console.hairline}`,
          })}
        >
          <Cell divider>
            {locked ? (
              <Typography sx={{ fontWeight: 600 }}>{opt.name}</Typography>
            ) : (
              <TextField
                size="small"
                fullWidth
                value={opt.name}
                onChange={(e) => onChange(updateOption(group, opt.id, { name: e.target.value }))}
                aria-label="Option name"
              />
            )}
          </Cell>
          <Cell divider>
            {locked ? (
              <Typography>{formatExtraMinor(opt.priceMinor)}</Typography>
            ) : (
              <TextField
                size="small"
                type="number"
                value={opt.priceMinor / 100}
                onChange={(e) =>
                  onChange(updateOption(group, opt.id, { priceMinor: poundsToMinor(e.target.value) }))
                }
                aria-label="Extra price"
                slotProps={{
                  htmlInput: { min: 0, step: 0.01 },
                  input: {
                    startAdornment: <InputAdornment position="start">£</InputAdornment>,
                  },
                }}
                sx={{ width: 112 }}
              />
            )}
          </Cell>
          <Cell divider>
            {group.selectionType === 'single' ? (
              <Radio
                size="small"
                checked={opt.isDefault}
                onChange={() => onChange(setDefault(group, opt.id, true))}
                slotProps={{ input: { 'aria-label': `Default ${opt.name}` } }}
              />
            ) : (
              <Switch
                size="small"
                checked={opt.isDefault}
                onChange={(_, v) => onChange(setDefault(group, opt.id, v))}
                slotProps={{ input: { 'aria-label': `Default ${opt.name}` } }}
              />
            )}
          </Cell>
          <Cell>
            <KitchenLabelCell
              name={opt.name}
              colorHex={opt.colorHex}
              chipLabel={opt.chipLabel}
              editable={!locked}
              onColorChange={(colorHex) => onChange(updateOption(group, opt.id, { colorHex }))}
              onLabelChange={(chipLabel) => onChange(updateOption(group, opt.id, { chipLabel }))}
            />
          </Cell>
        </Box>
      ))}
    </Box>
  );
}
