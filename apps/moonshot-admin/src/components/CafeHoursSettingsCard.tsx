import type { Cafe, CafeHours, WeekdayKey } from '@moonshot/types';
import { WEEKDAY_KEYS, emptyCafeHours, toHhMm } from '@moonshot/types';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { patchAdminSettings } from '../lib/admin-api.js';

const DAY_LABELS: Record<WeekdayKey, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
};

type DayDraft = {
  open: boolean;
  openTime: string;
  closeTime: string;
};

function hoursToDraft(hours: CafeHours): Record<WeekdayKey, DayDraft> {
  const out = {} as Record<WeekdayKey, DayDraft>;
  for (const day of WEEKDAY_KEYS) {
    const iv = hours[day]?.[0];
    out[day] = {
      open: Boolean(iv),
      openTime: iv?.open ?? '08:00',
      closeTime: iv?.close ?? '16:00',
    };
  }
  return out;
}

function draftToHours(draft: Record<WeekdayKey, DayDraft>): CafeHours {
  const hours = emptyCafeHours();
  for (const day of WEEKDAY_KEYS) {
    const d = draft[day];
    if (d.open) {
      const open = toHhMm(d.openTime) ?? d.openTime;
      const close = toHhMm(d.closeTime) ?? d.closeTime;
      hours[day] = [{ open, close }];
    }
  }
  return hours;
}

type Props = {
  cafe: Cafe;
  token: string;
  onCafeUpdated: (c: Cafe) => void;
};

export function CafeHoursSettingsCard({ cafe, token, onCafeUpdated }: Props) {
  const [draft, setDraft] = useState(() => hoursToDraft(cafe.hours ?? emptyCafeHours()));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setDraft(hoursToDraft(cafe.hours ?? emptyCafeHours()));
  }, [cafe.hours]);

  function updateDay(day: WeekdayKey, patch: Partial<DayDraft>) {
    setDraft((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const data = await patchAdminSettings(token, { hours: draftToHours(draft) });
      onCafeUpdated(data.cafe);
      setMessage({ type: 'ok', text: 'Opening hours saved.' });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Opening hours
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Times are local to {cafe.timezone}. Empty / closed days block online ordering on the customer
        home screen.
      </Typography>
      {message && (
        <Alert
          severity={message.type === 'ok' ? 'success' : 'error'}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}
      <Stack spacing={1.5}>
        {WEEKDAY_KEYS.map((day) => {
          const d = draft[day];
          return (
            <Box
              key={day}
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: 1.5,
                alignItems: 'center',
              }}
            >
              <FormControlLabel
                sx={{ minWidth: 140, mr: 0 }}
                control={
                  <Switch
                    checked={d.open}
                    onChange={(_, v) => updateDay(day, { open: v })}
                    disabled={saving}
                    size="small"
                  />
                }
                label={DAY_LABELS[day]}
              />
              <TextField
                label="Open"
                type="time"
                size="small"
                value={d.openTime}
                onChange={(e) => updateDay(day, { openTime: e.target.value })}
                disabled={!d.open || saving}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                sx={{ width: 130 }}
              />
              <TextField
                label="Close"
                type="time"
                size="small"
                value={d.closeTime}
                onChange={(e) => updateDay(day, { closeTime: e.target.value })}
                disabled={!d.open || saving}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                sx={{ width: 130 }}
              />
            </Box>
          );
        })}
      </Stack>
      <Box sx={{ mt: 2 }}>
        <Button variant="contained" size="small" onClick={() => void save()} disabled={saving}>
          Save hours
        </Button>
      </Box>
    </Paper>
  );
}
