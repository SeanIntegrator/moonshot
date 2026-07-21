import type { Cafe } from '@moonshot/types';
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { patchAdminSettings } from '../lib/admin-api.js';

type Props = {
  cafe: Cafe;
  token: string;
  onCafeUpdated: (c: Cafe) => void;
};

export function OrderAheadSettingsCard({ cafe, token, onCafeUpdated }: Props) {
  const loyalty = cafe.features.loyalty;
  const oa = cafe.features.order_ahead;

  const [loyaltyOn, setLoyaltyOn] = useState(Boolean(loyalty?.enabled));
  const [stampsPerReward, setStampsPerReward] = useState(loyalty?.stampsPerReward ?? 10);
  const [defaultPickup, setDefaultPickup] = useState(oa?.defaultPickupMinutes ?? 10);
  const [maxPickup, setMaxPickup] = useState(oa?.maxPickupMinutes ?? 60);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setLoyaltyOn(Boolean(loyalty?.enabled));
    setStampsPerReward(loyalty?.stampsPerReward ?? 10);
  }, [loyalty]);

  useEffect(() => {
    setDefaultPickup(oa?.defaultPickupMinutes ?? 10);
    setMaxPickup(oa?.maxPickupMinutes ?? 60);
  }, [oa]);

  async function saveLoyalty() {
    setSaving(true);
    setMessage(null);
    try {
      const data = await patchAdminSettings(token, {
        featuresPatch: {
          loyalty: loyaltyOn ? { enabled: true, stampsPerReward: stampsPerReward } : null,
        },
      });
      onCafeUpdated(data.cafe);
      setMessage({ type: 'ok', text: 'Loyalty settings saved.' });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  async function savePickup() {
    setSaving(true);
    setMessage(null);
    try {
      const data = await patchAdminSettings(token, {
        featuresPatch: {
          order_ahead: {
            defaultPickupMinutes: defaultPickup,
            maxPickupMinutes: maxPickup,
          },
        },
      });
      onCafeUpdated(data.cafe);
      setMessage({ type: 'ok', text: 'Pickup settings saved.' });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Order ahead
      </Typography>
      {message && (
        <Alert severity={message.type === 'ok' ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Typography variant="subtitle2" color="text.secondary">
        Loyalty
      </Typography>
      <Stack spacing={2} sx={{ mt: 1, mb: 2 }}>
        <FormControlLabel
          control={<Switch checked={loyaltyOn} onChange={(_, v) => setLoyaltyOn(v)} disabled={saving} />}
          label="Loyalty programme enabled"
        />
        <TextField
          label="Stamps for a full card"
          type="number"
          size="small"
          value={stampsPerReward}
          onChange={(e) => setStampsPerReward(Number(e.target.value))}
          disabled={!loyaltyOn || saving}
          inputProps={{ min: 1, max: 50, step: 1 }}
          sx={{ maxWidth: 220 }}
        />
        <Box>
          <Button variant="contained" size="small" onClick={() => void saveLoyalty()} disabled={saving}>
            Save loyalty
          </Button>
        </Box>
      </Stack>

      <Divider sx={{ my: 2 }} />

      <Typography variant="subtitle2" color="text.secondary">
        Pickup timing
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 1 }} alignItems="flex-start">
        <TextField
          label="Minimum lead time (minutes)"
          type="number"
          size="small"
          value={defaultPickup}
          onChange={(e) => setDefaultPickup(Number(e.target.value))}
          disabled={saving}
          inputProps={{ min: 1, max: 1440, step: 1 }}
          helperText="Default earliest pickup slot"
        />
        <TextField
          label="Maximum lead time (minutes)"
          type="number"
          size="small"
          value={maxPickup}
          onChange={(e) => setMaxPickup(Number(e.target.value))}
          disabled={saving}
          inputProps={{ min: 1, max: 1440, step: 1 }}
        />
      </Stack>
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" size="small" onClick={() => void savePickup()} disabled={saving}>
          Save pickup
        </Button>
      </Box>
    </Paper>
  );
}
