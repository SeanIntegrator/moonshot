import type { KdsSoundId } from '@moonshot/types';
import { Alert, Box, FormControlLabel, Switch, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { KdsSoundSelect } from '../../../components/KdsSoundSelect.js';
import { useCafe } from '../../CafeProvider.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { ThresholdSlider } from '../../primitives/ThresholdSlider.js';

export function AlertsCard() {
  const { cafe, patchSettings } = useCafe();
  const k = cafe.kdsConfig;
  const [greenMax, setGreenMax] = useState(k.timerThresholds.greenMax);
  const [amberMax, setAmberMax] = useState(k.timerThresholds.amberMax);
  const [volume, setVolume] = useState(k.audio.volume);
  const [newOrderSound, setNewOrderSound] = useState<KdsSoundId | null>(k.audio.newOrderSound);
  const [overdueSound, setOverdueSound] = useState<KdsSoundId | null>(k.audio.overdueSound);
  const [overdueRepeat, setOverdueRepeat] = useState(k.audio.overdueRepeatSeconds);
  const [savingToggle, setSavingToggle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGreenMax(k.timerThresholds.greenMax);
    setAmberMax(k.timerThresholds.amberMax);
    setVolume(k.audio.volume);
    setNewOrderSound(k.audio.newOrderSound);
    setOverdueSound(k.audio.overdueSound);
    setOverdueRepeat(k.audio.overdueRepeatSeconds);
  }, [k]);

  const dirty =
    greenMax !== k.timerThresholds.greenMax ||
    amberMax !== k.timerThresholds.amberMax ||
    volume !== k.audio.volume ||
    newOrderSound !== k.audio.newOrderSound ||
    overdueSound !== k.audio.overdueSound ||
    overdueRepeat !== k.audio.overdueRepeatSeconds;

  const valid =
    Number.isInteger(volume) &&
    volume >= 0 &&
    volume <= 100 &&
    Number.isInteger(overdueRepeat) &&
    overdueRepeat >= 0 &&
    overdueRepeat <= 600 &&
    greenMax < amberMax;

  async function onEnabled(next: boolean) {
    setError(null);
    setSavingToggle(true);
    try {
      await patchSettings({ kdsConfigPatch: { audio: { enabled: next } } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update sounds');
    } finally {
      setSavingToggle(false);
    }
  }

  async function save() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await patchSettings({
        kdsConfigPatch: {
          timerThresholds: { greenMax, amberMax },
          audio: {
            newOrderSound,
            overdueSound,
            overdueRepeatSeconds: overdueRepeat,
            volume,
          },
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save alerts');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard
      title="Alerts and sounds"
      description="When a waiting ticket turns amber, then late — and what the kitchen hears."
      save={{
        label: 'Save alerts',
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
      <ThresholdSlider
        amberAfter={greenMax}
        lateAfter={amberMax}
        onChange={({ amberAfter, lateAfter }) => {
          setGreenMax(amberAfter);
          setAmberMax(lateAfter);
        }}
      />
      <FormControlLabel
        sx={{ display: 'flex', mt: 2 }}
        control={
          <Switch
            checked={k.audio.enabled}
            disabled={savingToggle}
            onChange={(_, v) => void onEnabled(v)}
          />
        }
        label="Play kitchen sounds"
      />
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
        <KdsSoundSelect
          label="New order sound"
          value={newOrderSound}
          onChange={setNewOrderSound}
          disabled={saving}
        />
        <KdsSoundSelect
          label="Overdue sound"
          value={overdueSound}
          onChange={setOverdueSound}
          disabled={saving}
        />
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
        <TextField
          label="Volume"
          type="number"
          size="small"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          sx={{ maxWidth: 140 }}
          slotProps={{ htmlInput: { min: 0, max: 100, step: 1 } }}
        />
        <TextField
          label="Overdue repeat (seconds)"
          type="number"
          size="small"
          value={overdueRepeat}
          onChange={(e) => setOverdueRepeat(Number(e.target.value))}
          helperText="0 disables the repeat"
          slotProps={{ htmlInput: { min: 0, max: 600, step: 1 } }}
        />
      </Box>
    </SettingsCard>
  );
}
