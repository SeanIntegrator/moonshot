import { Alert, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { useCafe } from '../../CafeProvider.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';

export function EtaCard() {
  const { cafe, patchSettings } = useCafe();
  const saved = cafe.kdsConfig.eta;
  const [basePrep, setBasePrep] = useState(saved.basePrepMinutes);
  const [perItem, setPerItem] = useState(saved.perItemMinutes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBasePrep(saved.basePrepMinutes);
    setPerItem(saved.perItemMinutes);
  }, [saved.basePrepMinutes, saved.perItemMinutes]);

  const dirty = basePrep !== saved.basePrepMinutes || perItem !== saved.perItemMinutes;
  const valid =
    Number.isInteger(basePrep) &&
    basePrep >= 1 &&
    basePrep <= 120 &&
    Number.isInteger(perItem) &&
    perItem >= 0 &&
    perItem <= 30;

  async function save() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await patchSettings({
        kdsConfigPatch: { eta: { basePrepMinutes: basePrep, perItemMinutes: perItem } },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save prep ETA');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard
      title="Prep ETA"
      description="Hints used when estimating how long a ticket will take."
      save={{
        label: 'Save ETA',
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
        label="Base prep (minutes)"
        type="number"
        size="small"
        value={basePrep}
        onChange={(e) => setBasePrep(Number(e.target.value))}
        sx={{ width: 180, mr: 2, mb: 1 }}
        slotProps={{ htmlInput: { min: 1, max: 120, step: 1 } }}
      />
      <TextField
        label="Per item (minutes)"
        type="number"
        size="small"
        value={perItem}
        onChange={(e) => setPerItem(Number(e.target.value))}
        sx={{ width: 180, mb: 1 }}
        slotProps={{ htmlInput: { min: 0, max: 30, step: 1 } }}
      />
    </SettingsCard>
  );
}
