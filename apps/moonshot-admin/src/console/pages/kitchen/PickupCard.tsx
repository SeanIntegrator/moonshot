import { Box, FormControlLabel, Switch, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useCafe } from '../../CafeProvider.js';
import { switchLoader } from '../../primitives/button-loader.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { useCafeSave, useImmediatePatch } from '../../primitives/useCafePatch.js';
import { fieldErrorProps } from '../../primitives/ValidationMessage.js';
import { kitchenFieldGridSx } from './KitchenSection.js';
import { earliestPickupSlot, isPickupTimingValid, pickupTimingError } from './pickup-timing.js';

export function PickupCard() {
  const { cafe } = useCafe();
  const oa = cafe.features.order_ahead;
  const savedEnabled = oa?.pickupTimeEnabled ?? true;
  const savedEarliest = oa?.defaultPickupMinutes ?? 10;
  const savedFurthest = oa?.maxPickupMinutes ?? 60;

  const [earliest, setEarliest] = useState(savedEarliest);
  const [furthest, setFurthest] = useState(savedFurthest);
  const { saving: savingToggle, patch: patchToggle } = useImmediatePatch('Could not update pickup');
  const { saving, save: savePatch } = useCafeSave('Could not save pickup');

  useEffect(() => {
    setEarliest(savedEarliest);
    setFurthest(savedFurthest);
  }, [savedEarliest, savedFurthest]);

  const dirty = earliest !== savedEarliest || furthest !== savedFurthest;
  const timingErr = pickupTimingError(earliest, furthest);
  const valid = isPickupTimingValid(earliest, furthest);
  const slot =
    Number.isInteger(earliest) && earliest >= 1
      ? earliestPickupSlot(new Date(), earliest, cafe.timezone)
      : null;

  async function onToggle(next: boolean) {
    await patchToggle({ featuresPatch: { order_ahead: { pickupTimeEnabled: next } } });
  }

  async function save() {
    if (!valid) return;
    await savePatch({
      featuresPatch: {
        order_ahead: {
          defaultPickupMinutes: earliest,
          maxPickupMinutes: furthest,
        },
      },
    });
  }

  return (
    <SettingsCard
      title="Pickup timing"
      description="How far ahead customers can order."
      save={{
        label: 'Save timing',
        dirty,
        valid,
        saving,
        onSave: () => void save(),
      }}
    >
      <FormControlLabel
        sx={{ display: 'flex', mb: 2, ml: 0 }}
        control={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
            <Switch
              checked={savedEnabled}
              disabled={savingToggle}
              onChange={(_, v) => void onToggle(v)}
            />
            {switchLoader(savingToggle)}
          </Box>
        }
        label="Let customers choose a pickup time"
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          opacity: savedEnabled ? 1 : 0.55,
          pointerEvents: savedEnabled ? 'auto' : 'none',
        }}
      >
        <Box sx={kitchenFieldGridSx}>
          <TextField
            label="Earliest pickup (minutes)"
            type="number"
            size="small"
            value={earliest}
            onChange={(e) => setEarliest(Number(e.target.value))}
            fullWidth
            {...fieldErrorProps(dirty ? timingErr : null)}
            slotProps={{ htmlInput: { min: 1, max: 1440, step: 1 } }}
          />
          <TextField
            label="Furthest ahead (minutes)"
            type="number"
            size="small"
            value={furthest}
            onChange={(e) => setFurthest(Number(e.target.value))}
            fullWidth
            {...fieldErrorProps(dirty ? timingErr : null)}
            slotProps={{ htmlInput: { min: 1, max: 1440, step: 1 } }}
          />
        </Box>
        {slot ? (
          <Box
            sx={(theme) => ({
              bgcolor: theme.console.readonly.fill,
              border: `1px solid ${theme.console.readonly.border}`,
              borderRadius: 1.5,
              px: 2,
              py: 1.25,
            })}
          >
            <Typography variant="body2" sx={{ color: 'text.primary' }}>
              A customer ordering now would be offered <strong>{slot}</strong> as the earliest
              slot.
            </Typography>
          </Box>
        ) : null}
      </Box>
    </SettingsCard>
  );
}
