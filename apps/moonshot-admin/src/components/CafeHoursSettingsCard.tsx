import type { Cafe, CafeHours, CafeHoursInterval, WeekdayKey } from '@moonshot/types';
import { WEEKDAY_KEYS, emptyCafeHours, toHhMm } from '@moonshot/types';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
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

const DEFAULT_INTERVAL: CafeHoursInterval = { open: '08:00', close: '16:00' };

type DayDraft = {
  /** Closed when empty; otherwise one or more open/close windows. */
  intervals: CafeHoursInterval[];
};

function hoursToDraft(hours: CafeHours): Record<WeekdayKey, DayDraft> {
  const out = {} as Record<WeekdayKey, DayDraft>;
  for (const day of WEEKDAY_KEYS) {
    const intervals = hours[day] ?? [];
    out[day] = {
      // Preserve every interval — never drop extras when loading into the editor.
      intervals: intervals.map((iv) => ({ open: iv.open, close: iv.close })),
    };
  }
  return out;
}

function draftToHours(draft: Record<WeekdayKey, DayDraft>): CafeHours {
  const hours = emptyCafeHours();
  for (const day of WEEKDAY_KEYS) {
    const intervals: CafeHoursInterval[] = [];
    for (const iv of draft[day].intervals) {
      const open = toHhMm(iv.open) ?? iv.open;
      const close = toHhMm(iv.close) ?? iv.close;
      intervals.push({ open, close });
    }
    hours[day] = intervals;
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

  function setDayOpen(day: WeekdayKey, open: boolean) {
    setDraft((prev) => ({
      ...prev,
      [day]: {
        intervals: open
          ? prev[day].intervals.length > 0
            ? prev[day].intervals
            : [{ ...DEFAULT_INTERVAL }]
          : [],
      },
    }));
  }

  function updateInterval(day: WeekdayKey, index: number, patch: Partial<CafeHoursInterval>) {
    setDraft((prev) => {
      const intervals = prev[day].intervals.map((iv, i) => (i === index ? { ...iv, ...patch } : iv));
      return { ...prev, [day]: { intervals } };
    });
  }

  function addInterval(day: WeekdayKey) {
    setDraft((prev) => ({
      ...prev,
      [day]: {
        intervals: [...prev[day].intervals, { ...DEFAULT_INTERVAL }],
      },
    }));
  }

  function removeInterval(day: WeekdayKey, index: number) {
    setDraft((prev) => {
      const intervals = prev[day].intervals.filter((_, i) => i !== index);
      return { ...prev, [day]: { intervals } };
    });
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
        home screen. Use Add window for split shifts (e.g. lunch + afternoon).
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
      <Stack spacing={2}>
        {WEEKDAY_KEYS.map((day) => {
          const d = draft[day];
          const isOpen = d.intervals.length > 0;
          return (
            <Box key={day}>
              <Box
                sx={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  alignItems: 'center',
                  mb: isOpen ? 1 : 0,
                }}
              >
                <FormControlLabel
                  sx={{ minWidth: 140, mr: 0 }}
                  control={
                    <Switch
                      checked={isOpen}
                      onChange={(_, v) => setDayOpen(day, v)}
                      disabled={saving}
                      size="small"
                    />
                  }
                  label={DAY_LABELS[day]}
                />
                {isOpen && (
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => addInterval(day)}
                    disabled={saving}
                  >
                    Add window
                  </Button>
                )}
              </Box>
              {d.intervals.map((iv, index) => (
                <Box
                  key={`${day}-${index}`}
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 1.5,
                    alignItems: 'center',
                    ml: { sm: 2 },
                    mb: 1,
                  }}
                >
                  <TextField
                    label={d.intervals.length > 1 ? `Open ${index + 1}` : 'Open'}
                    type="time"
                    size="small"
                    value={iv.open}
                    onChange={(e) => updateInterval(day, index, { open: e.target.value })}
                    disabled={saving}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 300 }}
                    sx={{ width: 130 }}
                  />
                  <TextField
                    label={d.intervals.length > 1 ? `Close ${index + 1}` : 'Close'}
                    type="time"
                    size="small"
                    value={iv.close}
                    onChange={(e) => updateInterval(day, index, { close: e.target.value })}
                    disabled={saving}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{ step: 300 }}
                    sx={{ width: 130 }}
                  />
                  {d.intervals.length > 1 && (
                    <IconButton
                      aria-label={`Remove window ${index + 1}`}
                      size="small"
                      onClick={() => removeInterval(day, index)}
                      disabled={saving}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              ))}
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
