import {
  Box,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useCafe } from '../../CafeProvider.js';
import { switchLoader } from '../../primitives/button-loader.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { WeekdayPillGroup } from '../../primitives/WeekdayPillGroup.js';
import { fieldErrorProps } from '../../primitives/ValidationMessage.js';
import { useCafeSave, useImmediatePatch } from '../../primitives/useCafePatch.js';
import {
  doubleStampSummary,
  isLoyaltyFormValid,
  loyaltyRewardError,
  loyaltyStampsError,
} from './loyalty-form.js';

const EMPTY_DAYS: string[] = [];
const DEFAULT_STAMPS = 10;
const DEFAULT_REWARD = 'Free drink';

export function LoyaltyCard() {
  const { cafe } = useCafe();
  const saved = cafe.features.loyalty;
  const savedEnabled = Boolean(saved?.enabled);
  const savedStamps = saved?.stampsPerReward ?? DEFAULT_STAMPS;
  const savedReward = saved?.rewardDescription ?? DEFAULT_REWARD;
  const savedDays = saved?.doubleStampDays ?? EMPTY_DAYS;

  const [stamps, setStamps] = useState(savedStamps);
  const [reward, setReward] = useState(savedReward);
  const [days, setDays] = useState<string[]>([...savedDays]);
  const { saving: savingToggle, patch: patchToggle } = useImmediatePatch('Could not update loyalty');
  const { saving: savingForm, save: saveFormPatch } = useCafeSave('Could not save loyalty');

  useEffect(() => {
    setStamps(savedStamps);
    setReward(savedReward);
    setDays([...savedDays]);
  }, [savedStamps, savedReward, savedDays]);

  const dirty =
    stamps !== savedStamps ||
    reward.trim() !== savedReward.trim() ||
    JSON.stringify(days) !== JSON.stringify(savedDays);

  const rewardErr = loyaltyRewardError(savedEnabled, reward);
  const stampsErr = loyaltyStampsError(stamps);
  const valid = isLoyaltyFormValid({ enabled: savedEnabled, stamps, reward });

  async function onToggle(next: boolean) {
    await patchToggle({
      featuresPatch: {
        loyalty: {
          enabled: next,
          stampsPerReward: loyaltyStampsError(stamps) ? DEFAULT_STAMPS : stamps,
          rewardDescription: reward.trim() || DEFAULT_REWARD,
          doubleStampDays: days,
        },
      },
    });
  }

  async function saveForm() {
    if (!valid) return;
    await saveFormPatch({
      featuresPatch: {
        loyalty: {
          enabled: savedEnabled,
          stampsPerReward: stamps,
          rewardDescription: reward.trim(),
          doubleStampDays: days,
        },
      },
    });
  }

  const dimmed = !savedEnabled;

  return (
    <SettingsCard
      title="Loyalty"
      description={
        savedEnabled
          ? 'A stamp per order, a free drink when the card fills.'
          : "Loyalty is off. Customers don't see a stamp card, and existing stamps are kept until you switch it back on."
      }
      headerAction={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {switchLoader(savingToggle)}
          <FormControlLabel
            sx={{ mr: 0 }}
            control={
              <Switch
                checked={savedEnabled}
                disabled={savingToggle}
                onChange={(_, v) => void onToggle(v)}
              />
            }
            label={savedEnabled ? 'On' : 'Off'}
          />
        </Box>
      }
      save={{
        label: 'Save loyalty',
        dirty,
        valid: savedEnabled && valid,
        saving: savingForm,
        onSave: () => void saveForm(),
      }}
    >
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          opacity: dimmed ? 0.55 : 1,
          pointerEvents: dimmed ? 'none' : 'auto',
        }}
      >
        <TextField
          label="Stamps for a full card"
          type="number"
          size="small"
          value={stamps}
          onChange={(e) => setStamps(Number(e.target.value))}
          sx={{ maxWidth: 220 }}
          {...fieldErrorProps(dirty ? stampsErr : null)}
          slotProps={{ htmlInput: { min: 1, max: 50, step: 1 } }}
        />
        <TextField
          label="Reward"
          size="small"
          value={reward}
          onChange={(e) => setReward(e.target.value)}
          helperText={rewardErr && dirty ? rewardErr : 'Reward is just the label customers see.'}
          error={Boolean(rewardErr && dirty)}
        />
        <Box>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Double stamp days
          </Typography>
          <WeekdayPillGroup value={days} onChange={setDays} disabled={dimmed} />
          <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
            {doubleStampSummary(days)}
          </Typography>
        </Box>
      </Box>
    </SettingsCard>
  );
}
