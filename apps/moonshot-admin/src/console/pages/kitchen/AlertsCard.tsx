import type { KdsSoundId } from '@moonshot/types';
import { Alert, Box, FormControlLabel, Switch, TextField } from '@mui/material';
import { useEffect, useState } from 'react';
import { KdsSoundSelect } from '../../../components/KdsSoundSelect.js';
import { useCafe } from '../../CafeProvider.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { ThresholdSlider } from '../../primitives/ThresholdSlider.js';
import { KitchenSection, kitchenFieldGridSx } from './KitchenSection.js';

export function AlertsCard() {
  const { cafe, patchSettings } = useCafe();
  const k = cafe.kdsConfig;
  const [greenMax, setGreenMax] = useState(k.timerThresholds.greenMax);
  const [amberMax, setAmberMax] = useState(k.timerThresholds.amberMax);
  const [newOrderSound, setNewOrderSound] = useState<KdsSoundId | null>(k.audio.newOrderSound);
  const [overdueSound, setOverdueSound] = useState<KdsSoundId | null>(k.audio.overdueSound);
  const [overdueRepeat, setOverdueRepeat] = useState(k.audio.overdueRepeatSeconds);
  const [savingToggle, setSavingToggle] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGreenMax(k.timerThresholds.greenMax);
    setAmberMax(k.timerThresholds.amberMax);
    setNewOrderSound(k.audio.newOrderSound);
    setOverdueSound(k.audio.overdueSound);
    setOverdueRepeat(k.audio.overdueRepeatSeconds);
  }, [k]);

  const dirty =
    greenMax !== k.timerThresholds.greenMax ||
    amberMax !== k.timerThresholds.amberMax ||
    newOrderSound !== k.audio.newOrderSound ||
    overdueSound !== k.audio.overdueSound ||
    overdueRepeat !== k.audio.overdueRepeatSeconds;

  const valid =
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
          },
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save alerts');
    } finally {
      setSaving(false);
    }
  }

  const soundsOff = !k.audio.enabled;

  return (
    <SettingsCard
      title="Alerts & sounds"
      description="When a waiting order starts to look late, and what the tablet plays."
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
      <Box sx={{ mt: 2.5 }}>
        <KitchenSection title="KDS SOUNDS">
          <FormControlLabel
            sx={{ display: 'flex', ml: 0, mb: 1.5 }}
            control={
              <Switch
                checked={k.audio.enabled}
                disabled={savingToggle}
                onChange={(_, v) => void onEnabled(v)}
              />
            }
            label="Play sounds on the kitchen display"
          />
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              opacity: soundsOff ? 0.55 : 1,
              pointerEvents: soundsOff ? 'none' : 'auto',
            }}
          >
            <Box sx={kitchenFieldGridSx}>
              <KdsSoundSelect
                label="New order"
                value={newOrderSound}
                onChange={setNewOrderSound}
                disabled={saving || soundsOff}
              />
              <KdsSoundSelect
                label="Order goes late"
                value={overdueSound}
                onChange={setOverdueSound}
                disabled={saving || soundsOff}
              />
            </Box>
            <TextField
              label="Overdue repeat (seconds)"
              type="number"
              size="small"
              value={overdueRepeat}
              onChange={(e) => setOverdueRepeat(Number(e.target.value))}
              helperText="0 disables the repeat"
              disabled={saving || soundsOff}
              sx={{ maxWidth: 280 }}
              slotProps={{ htmlInput: { min: 0, max: 600, step: 1 } }}
            />
          </Box>
        </KitchenSection>
      </Box>
    </SettingsCard>
  );
}
