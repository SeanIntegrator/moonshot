import type { Cafe, KdsGroupBy } from '@moonshot/types';
import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  type SelectChangeEvent,
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

export function KdsSettingsCard({ cafe, token, onCafeUpdated }: Props) {
  const k = cafe.kdsConfig;
  const [columns, setColumns] = useState(k.layout.columns);
  const [groupBy, setGroupBy] = useState<KdsGroupBy>(k.layout.groupBy);
  const [showName, setShowName] = useState(k.display.showCustomerNameInHeader);
  const [showPickup, setShowPickup] = useState(k.display.showPickupTime);
  const [showSource, setShowSource] = useState(k.display.showOrderSource);
  const [basePrep, setBasePrep] = useState(k.eta.basePrepMinutes);
  const [perItem, setPerItem] = useState(k.eta.perItemMinutes);
  const [greenMax, setGreenMax] = useState(k.timerThresholds.greenMax);
  const [amberMax, setAmberMax] = useState(k.timerThresholds.amberMax);
  const [volume, setVolume] = useState(k.audio.volume);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setColumns(k.layout.columns);
    setGroupBy(k.layout.groupBy);
    setShowName(k.display.showCustomerNameInHeader);
    setShowPickup(k.display.showPickupTime);
    setShowSource(k.display.showOrderSource);
    setBasePrep(k.eta.basePrepMinutes);
    setPerItem(k.eta.perItemMinutes);
    setGreenMax(k.timerThresholds.greenMax);
    setAmberMax(k.timerThresholds.amberMax);
    setVolume(k.audio.volume);
  }, [k]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const data = await patchAdminSettings(token, {
        kdsConfigPatch: {
          layout: { columns, groupBy },
          display: {
            showCustomerNameInHeader: showName,
            showPickupTime: showPickup,
            showOrderSource: showSource,
          },
          eta: { basePrepMinutes: basePrep, perItemMinutes: perItem },
          timerThresholds: { greenMax, amberMax },
          audio: { volume },
        },
      });
      onCafeUpdated(data.cafe);
      setMessage({ type: 'ok', text: 'KDS settings saved.' });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Kitchen display (KDS)
      </Typography>
      {message && (
        <Alert severity={message.type === 'ok' ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Columns"
            type="number"
            size="small"
            value={columns}
            onChange={(e) => setColumns(Number(e.target.value))}
            disabled={saving}
            inputProps={{ min: 1, max: 6, step: 1 }}
            sx={{ width: 120 }}
          />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel id="kds-groupby-label">Group by</InputLabel>
            <Select
              labelId="kds-groupby-label"
              label="Group by"
              value={groupBy}
              onChange={(e: SelectChangeEvent<KdsGroupBy>) => setGroupBy(e.target.value as KdsGroupBy)}
              disabled={saving}
            >
              <MenuItem value="order_type">Order type</MenuItem>
              <MenuItem value="none">None</MenuItem>
            </Select>
          </FormControl>
        </Stack>
        <Typography variant="subtitle2" color="text.secondary">
          Display
        </Typography>
        <FormControlLabel
          control={<Switch checked={showName} onChange={(_, v) => setShowName(v)} disabled={saving} />}
          label="Show customer name in header"
        />
        <FormControlLabel
          control={<Switch checked={showPickup} onChange={(_, v) => setShowPickup(v)} disabled={saving} />}
          label="Show pickup time"
        />
        <FormControlLabel
          control={<Switch checked={showSource} onChange={(_, v) => setShowSource(v)} disabled={saving} />}
          label="Show order source"
        />
        <Typography variant="subtitle2" color="text.secondary">
          Prep ETA hints
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Base prep (minutes)"
            type="number"
            size="small"
            value={basePrep}
            onChange={(e) => setBasePrep(Number(e.target.value))}
            disabled={saving}
            inputProps={{ min: 1, max: 120, step: 1 }}
          />
          <TextField
            label="Per item (minutes)"
            type="number"
            size="small"
            value={perItem}
            onChange={(e) => setPerItem(Number(e.target.value))}
            disabled={saving}
            inputProps={{ min: 0, max: 30, step: 1 }}
          />
        </Stack>
        <Typography variant="subtitle2" color="text.secondary">
          Ticket timer thresholds (minutes)
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField
            label="Green max"
            type="number"
            size="small"
            value={greenMax}
            onChange={(e) => setGreenMax(Number(e.target.value))}
            disabled={saving}
            inputProps={{ min: 1, max: 60, step: 1 }}
          />
          <TextField
            label="Amber max"
            type="number"
            size="small"
            value={amberMax}
            onChange={(e) => setAmberMax(Number(e.target.value))}
            disabled={saving}
            inputProps={{ min: 2, max: 120, step: 1 }}
          />
        </Stack>
        <TextField
          label="New order sound volume"
          type="number"
          size="small"
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          disabled={saving}
          inputProps={{ min: 0, max: 100, step: 1 }}
          sx={{ maxWidth: 220 }}
        />
        <Box>
          <Button variant="contained" onClick={() => void save()} disabled={saving}>
            Save KDS settings
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
