import type { CafeModifierGroup, NormalisedModifierOption } from '@moonshot/types';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import {
  Box,
  IconButton,
  InputAdornment,
  Radio,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { extraPoundsInput, formatExtraMinor, poundsToMinor } from './extra-price.js';
import { KitchenLabelCell } from './KitchenLabelCell.js';
import { defaultCellLabel } from './modifier-list-copy.js';
import { removeOption, setDefault, updateOption } from './modifier-option-draft.js';
import { RemoveOptionDialog } from './RemoveOptionDialog.js';

export const EXTRA_COL_WIDTH = 112;
export const DEFAULT_COL_WIDTH = 200;
export const DELETE_COL_WIDTH = 44;
export const SWATCH_COL_WIDTH = 40;

type Props = {
  group: CafeModifierGroup;
  optionId: string;
  locked: boolean;
  showMilkSwatch: boolean;
  canRemove: boolean;
  onChange: (next: CafeModifierGroup) => void;
};

export function ModifierOptionRow({
  group,
  optionId,
  locked,
  showMilkSwatch,
  canRemove,
  onChange,
}: Props) {
  const opt = group.options.find((o) => o.id === optionId);
  const groupRef = useRef(group);
  groupRef.current = group;

  const [name, setName] = useState(opt?.name ?? '');
  const [priceText, setPriceText] = useState(extraPoundsInput(opt?.priceMinor ?? 0));
  const [confirmRemove, setConfirmRemove] = useState(false);
  const nameFocused = useRef(false);
  const priceFocused = useRef(false);

  useEffect(() => {
    if (!nameFocused.current) setName(opt?.name ?? '');
  }, [opt?.name]);
  useEffect(() => {
    if (!priceFocused.current) setPriceText(extraPoundsInput(opt?.priceMinor ?? 0));
  }, [opt?.priceMinor]);

  if (!opt) return null;

  function patch(next: Partial<NormalisedModifierOption>) {
    onChange(updateOption(groupRef.current, optionId, next));
  }

  function handleRemoveConfirm() {
    onChange(removeOption(groupRef.current, optionId));
    setConfirmRemove(false);
  }

  return (
    <>
      <Box
        sx={(theme) => ({
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          px: { xs: 2, sm: 3 },
          py: 2,
          borderBottom: `1px solid ${theme.console.hairline}`,
        })}
      >
        {showMilkSwatch ? (
          <Box sx={{ flex: `0 0 ${SWATCH_COL_WIDTH}px` }}>
            <KitchenLabelCell
              name={opt.name}
              colorHex={opt.colorHex}
              chipLabel={opt.chipLabel}
              editable
              onColorChange={(colorHex) => patch({ colorHex })}
            />
          </Box>
        ) : null}
        <Box sx={{ flex: '1 1 160px', minWidth: 0 }}>
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
        </Box>
        <Box sx={{ flex: `0 0 ${EXTRA_COL_WIDTH}px` }}>
          {locked ? (
            <Typography>{formatExtraMinor(opt.priceMinor)}</Typography>
          ) : (
            <TextField
              size="small"
              label="Extra"
              value={priceText}
              onFocus={(e) => {
                priceFocused.current = true;
                e.target.select();
              }}
              onChange={(e) => setPriceText(e.target.value)}
              onBlur={(e) => {
                priceFocused.current = false;
                const minor = poundsToMinor(e.target.value);
                setPriceText(extraPoundsInput(minor));
                patch({ priceMinor: minor });
              }}
              aria-label="Extra price"
              slotProps={{
                inputLabel: { shrink: true },
                input: {
                  startAdornment: <InputAdornment position="start">£</InputAdornment>,
                },
              }}
              sx={{ width: EXTRA_COL_WIDTH }}
            />
          )}
        </Box>
        <Box
          sx={{
            flex: `0 0 ${DEFAULT_COL_WIDTH}px`,
            display: 'flex',
            justifyContent: 'center',
          }}
        >
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
        </Box>
        {!locked ? (
          <Box
            sx={{
              flex: `0 0 ${DELETE_COL_WIDTH}px`,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            {canRemove ? (
              <IconButton
                aria-label={`Remove ${opt.name}`}
                size="small"
                onClick={() => setConfirmRemove(true)}
                sx={(theme) => ({ color: theme.console.stock.out })}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            ) : null}
          </Box>
        ) : null}
      </Box>
      <RemoveOptionDialog
        open={confirmRemove}
        optionName={opt.name}
        onClose={() => setConfirmRemove(false)}
        onConfirm={handleRemoveConfirm}
      />
    </>
  );
}
