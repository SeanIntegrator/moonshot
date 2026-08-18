import type { CafeModifierGroup, NormalisedModifierOption } from '@moonshot/types';
import { Box, Button, InputAdornment, Radio, Switch, TextField, Typography } from '@mui/material';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { formatExtraMinor, minorToPoundsInput, poundsToMinor } from './extra-price.js';
import { KitchenLabelCell } from './KitchenLabelCell.js';
import { defaultCellLabel } from './modifier-list-copy.js';
import { removeOption, setDefault, updateOption } from './modifier-option-draft.js';

export const COLS_LOCKED =
  'minmax(140px, 1.4fr) minmax(88px, 0.7fr) minmax(88px, 0.6fr) minmax(120px, 0.9fr)';
export const COLS_EDIT =
  'minmax(140px, 1.4fr) minmax(88px, 0.7fr) minmax(88px, 0.6fr) minmax(120px, 0.9fr) minmax(72px, 0.45fr)';

export function Cell({ children, divider }: { children: ReactNode; divider?: boolean }) {
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

type Props = {
  group: CafeModifierGroup;
  optionId: string;
  locked: boolean;
  canRemove: boolean;
  onChange: (next: CafeModifierGroup) => void;
};

export function ModifierOptionRow({ group, optionId, locked, canRemove, onChange }: Props) {
  const opt = group.options.find((o) => o.id === optionId);
  const groupRef = useRef(group);
  groupRef.current = group;

  const [name, setName] = useState(opt?.name ?? '');
  const [priceText, setPriceText] = useState(minorToPoundsInput(opt?.priceMinor ?? 0));
  const nameFocused = useRef(false);
  const priceFocused = useRef(false);

  useEffect(() => {
    if (!nameFocused.current) setName(opt?.name ?? '');
  }, [opt?.name]);
  useEffect(() => {
    if (!priceFocused.current) setPriceText(minorToPoundsInput(opt?.priceMinor ?? 0));
  }, [opt?.priceMinor]);

  if (!opt) return null;

  function patch(next: Partial<NormalisedModifierOption>) {
    onChange(updateOption(groupRef.current, optionId, next));
  }

  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: locked ? COLS_LOCKED : COLS_EDIT,
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
            value={name}
            onFocus={() => {
              nameFocused.current = true;
            }}
            onChange={(e) => setName(e.target.value)}
            onBlur={(e) => {
              nameFocused.current = false;
              patch({ name: e.target.value });
            }}
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
            value={priceText}
            onFocus={() => {
              priceFocused.current = true;
            }}
            onChange={(e) => setPriceText(e.target.value)}
            onBlur={(e) => {
              priceFocused.current = false;
              const minor = poundsToMinor(e.target.value);
              setPriceText(minorToPoundsInput(minor));
              patch({ priceMinor: minor });
            }}
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
        {locked ? (
          <Typography variant="body2">{defaultCellLabel(opt.isDefault)}</Typography>
        ) : group.selectionType === 'single' ? (
          <Radio
            size="small"
            checked={opt.isDefault}
            onChange={() => onChange(setDefault(groupRef.current, optionId, true))}
            slotProps={{ input: { 'aria-label': `Default ${opt.name}` } }}
          />
        ) : (
          <Switch
            size="small"
            checked={opt.isDefault}
            onChange={(_, v) => onChange(setDefault(groupRef.current, optionId, v))}
            slotProps={{ input: { 'aria-label': `Default ${opt.name}` } }}
          />
        )}
      </Cell>
      <Cell divider={!locked}>
        <KitchenLabelCell
          name={opt.name}
          colorHex={opt.colorHex}
          chipLabel={opt.chipLabel}
          editable={!locked}
          onColorChange={(colorHex) => patch({ colorHex })}
          onLabelChange={(chipLabel) => patch({ chipLabel })}
        />
      </Cell>
      {locked ? null : (
        <Cell>
          {canRemove ? (
            <Button
              variant="text"
              size="small"
              onClick={() => onChange(removeOption(groupRef.current, optionId))}
              sx={(theme) => ({ color: theme.console.stock.out, minWidth: 0, px: 0.5 })}
            >
              remove
            </Button>
          ) : null}
        </Cell>
      )}
    </Box>
  );
}
