import {
  MODIFIER_FAMILY_LABELS,
  MODIFIER_SLOT_LABELS,
  type ModifierFamily,
  type ModifierSlot,
} from '@moonshot/types';
import { FormControl, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import { familyForSlot } from '@moonshot/domain';

const SLOTS_BY_FAMILY: Record<ModifierFamily, ModifierSlot[]> = {
  milk: ['milk', 'milk_temperature', 'milk_texture'],
  coffee: ['shots', 'beans'],
  flavours: ['syrup', 'toppings'],
  preparation: ['ice_level'],
  other: ['other'],
};

type Props = {
  value: ModifierSlot;
  onChange: (slot: ModifierSlot) => void;
  disabled?: boolean;
};

export function ModifierSlotSelect({ value, onChange, disabled }: Props) {
  function handleChange(e: SelectChangeEvent<string>) {
    onChange(e.target.value as ModifierSlot);
  }

  return (
    <FormControl size="small" sx={{ minWidth: 220 }} disabled={disabled}>
      <InputLabel id="modifier-slot-label">List type</InputLabel>
      <Select
        labelId="modifier-slot-label"
        label="List type"
        value={value}
        onChange={handleChange}
      >
        {(Object.keys(SLOTS_BY_FAMILY) as ModifierFamily[]).map((family) => [
          <MenuItem key={`${family}-heading`} disabled sx={{ opacity: 1, fontWeight: 600 }}>
            {MODIFIER_FAMILY_LABELS[family]}
          </MenuItem>,
          ...SLOTS_BY_FAMILY[family].map((slot) => (
            <MenuItem key={slot} value={slot} sx={{ pl: 3 }}>
              {MODIFIER_SLOT_LABELS[slot]}
            </MenuItem>
          )),
        ])}
      </Select>
    </FormControl>
  );
}

export function familyLabelForSlot(slot: ModifierSlot): string {
  return MODIFIER_FAMILY_LABELS[familyForSlot(slot)];
}
