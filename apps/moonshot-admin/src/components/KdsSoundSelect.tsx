import type { KdsSoundId } from '@moonshot/types';
import { KDS_SOUND_IDS, KDS_SOUNDS } from '@moonshot/domain';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material';

type Props = {
  label: string;
  value: KdsSoundId | null;
  onChange: (next: KdsSoundId | null) => void;
  disabled: boolean;
};

export function KdsSoundSelect({ label, value, onChange, disabled }: Props) {
  return (
    <FormControl size="small" fullWidth sx={{ minWidth: 180 }}>
      <InputLabel>{label}</InputLabel>
      <Select
        label={label}
        value={value ?? ''}
        onChange={(e: SelectChangeEvent<string>) => {
          const next = e.target.value;
          onChange(next === '' ? null : (next as KdsSoundId));
        }}
        disabled={disabled}
      >
        <MenuItem value="">None</MenuItem>
        {KDS_SOUND_IDS.map((id) => (
          <MenuItem key={id} value={id}>
            {KDS_SOUNDS[id].label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
