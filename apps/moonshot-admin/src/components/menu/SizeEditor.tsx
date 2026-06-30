import type { NormalisedItemSize } from '@moonshot/types';
import {
  Box,
  Button,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { ColorChipField } from './ColorChipField.js';

function newSize(): NormalisedItemSize {
  return {
    id: crypto.randomUUID(),
    name: '',
    priceMinor: 0,
    isDefault: false,
    colorHex: '#e8e8e8',
    chipLabel: '',
  };
}

type Props = {
  sizes: NormalisedItemSize[];
  currency: string;
  onChange: (sizes: NormalisedItemSize[]) => void;
};

export function SizeEditor({ sizes, currency, onChange }: Props) {
  function updateAt(index: number, patch: Partial<NormalisedItemSize>) {
    onChange(sizes.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }

  function setDefault(index: number) {
    onChange(sizes.map((s, i) => ({ ...s, isDefault: i === index })));
  }

  function removeAt(index: number) {
    onChange(sizes.filter((_, i) => i !== index));
  }

  return (
    <Box>
      <Typography variant="subtitle2" color="text.secondary" gutterBottom>
        Sizes ({currency}) — leave empty for a single-price item
      </Typography>
      <Stack spacing={1.5}>
        {sizes.map((size, index) => (
          <Box
            key={size.id}
            sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems="flex-start">
              <TextField
                label="Size name"
                size="small"
                value={size.name}
                onChange={(e) => updateAt(index, { name: e.target.value })}
                sx={{ minWidth: 120 }}
              />
              <TextField
                label={`Price (${currency})`}
                type="number"
                size="small"
                value={size.priceMinor / 100}
                onChange={(e) => {
                  const v = Number.parseFloat(e.target.value);
                  if (Number.isFinite(v)) updateAt(index, { priceMinor: Math.round(v * 100) });
                }}
                inputProps={{ min: 0, step: 0.01 }}
                sx={{ width: 120 }}
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={size.isDefault}
                    onChange={() => setDefault(index)}
                    size="small"
                  />
                }
                label="Default"
              />
              <Button size="small" color="error" onClick={() => removeAt(index)}>
                Remove
              </Button>
            </Stack>
            <Box sx={{ mt: 1 }}>
              <ColorChipField
                compact
                colorHex={size.colorHex ?? '#e8e8e8'}
                chipLabel={size.chipLabel ?? ''}
                onColorChange={(v) => updateAt(index, { colorHex: v })}
                onLabelChange={(v) => updateAt(index, { chipLabel: v })}
              />
            </Box>
          </Box>
        ))}
      </Stack>
      <Button size="small" sx={{ mt: 1 }} onClick={() => onChange([...sizes, newSize()])}>
        Add size
      </Button>
    </Box>
  );
}
