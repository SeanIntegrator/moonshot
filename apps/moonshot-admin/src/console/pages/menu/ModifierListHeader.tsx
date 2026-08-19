import { FormControlLabel, Switch, Typography } from '@mui/material';
import type { ModifierSelectionType } from '@moonshot/types';
import { customersPickLabel } from './modifier-list-copy.js';

type SelectionProps = {
  selectionType: ModifierSelectionType;
  locked?: boolean;
  onSelectionType: (next: ModifierSelectionType) => void;
};

type RequiredProps = {
  required: boolean;
  locked?: boolean;
  onRequired: (next: boolean) => void;
};

export function AllowMultipleSelectionsToggle({
  selectionType,
  locked = false,
  onSelectionType,
}: SelectionProps) {
  if (locked) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {customersPickLabel(selectionType)}
      </Typography>
    );
  }

  return (
    <FormControlLabel
      sx={{ mr: 0 }}
      control={
        <Switch
          checked={selectionType === 'multi'}
          onChange={(_, v) => onSelectionType(v ? 'multi' : 'single')}
          size="small"
        />
      }
      label="Allow multiple selections"
    />
  );
}

export function RequiredChoiceToggle({ required, locked = false, onRequired }: RequiredProps) {
  if (locked) {
    return (
      <Typography variant="body2">{required ? 'Required choice' : 'Optional'}</Typography>
    );
  }

  return (
    <FormControlLabel
      sx={{ mr: 0 }}
      control={<Switch checked={required} onChange={(_, v) => onRequired(v)} size="small" />}
      label="Required choice"
    />
  );
}
