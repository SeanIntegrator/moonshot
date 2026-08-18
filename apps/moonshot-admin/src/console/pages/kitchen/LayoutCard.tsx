import type { KdsGroupBy } from '@moonshot/types';
import {
  Alert,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SelectChangeEvent,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useCafe } from '../../CafeProvider.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';

export function LayoutCard() {
  const { cafe, patchSettings } = useCafe();
  const saved = cafe.kdsConfig.layout;
  const [columns, setColumns] = useState(saved.columns);
  const [groupBy, setGroupBy] = useState<KdsGroupBy>(saved.groupBy);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setColumns(saved.columns);
    setGroupBy(saved.groupBy);
  }, [saved.columns, saved.groupBy]);

  const dirty = columns !== saved.columns || groupBy !== saved.groupBy;
  const valid = Number.isInteger(columns) && columns >= 1 && columns <= 6;

  async function save() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await patchSettings({ kdsConfigPatch: { layout: { columns, groupBy } } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save layout');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard
      title="Layout"
      description="How tickets are arranged on the board."
      save={{
        label: 'Save layout',
        dirty,
        valid,
        saving,
        onSave: () => void save(),
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <TextField
        label="Columns"
        type="number"
        size="small"
        value={columns}
        onChange={(e) => setColumns(Number(e.target.value))}
        sx={{ width: 120, mr: 2, mb: 2 }}
        slotProps={{ htmlInput: { min: 1, max: 6, step: 1 } }}
      />
      <FormControl size="small" sx={{ minWidth: 180, mb: 2 }}>
        <InputLabel id="kds-groupby-label">Group by</InputLabel>
        <Select
          labelId="kds-groupby-label"
          label="Group by"
          value={groupBy}
          onChange={(e: SelectChangeEvent<KdsGroupBy>) => setGroupBy(e.target.value as KdsGroupBy)}
        >
          <MenuItem value="order_type">Order type</MenuItem>
          <MenuItem value="none">Don't group</MenuItem>
        </Select>
      </FormControl>
    </SettingsCard>
  );
}
