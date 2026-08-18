import type { KdsGroupBy } from '@moonshot/types';
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
} from '@mui/material';
import { KitchenSection } from './KitchenSection.js';

type Props = {
  groupBy: KdsGroupBy;
  disabled?: boolean;
  onGroupBy: (next: KdsGroupBy) => void;
};

export function LayoutCard({ groupBy, disabled, onGroupBy }: Props) {
  return (
    <KitchenSection title="LAYOUT">
      <FormControl size="small" fullWidth disabled={disabled} sx={{ maxWidth: 280 }}>
        <InputLabel id="kds-groupby-label">Group tickets by</InputLabel>
        <Select
          labelId="kds-groupby-label"
          label="Group tickets by"
          value={groupBy}
          onChange={(e: SelectChangeEvent<KdsGroupBy>) => onGroupBy(e.target.value as KdsGroupBy)}
        >
          <MenuItem value="order_type">Order type</MenuItem>
          <MenuItem value="none">Don't group</MenuItem>
          <MenuItem disabled>Smart order</MenuItem>
        </Select>
      </FormControl>
    </KitchenSection>
  );
}
