import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { Alert, Box, Button, FormControlLabel, IconButton, Switch, TextField } from '@mui/material';
import { WEEKDAY_KEYS, type CafeHoursInterval, type WeekdayKey } from '@moonshot/types';
import { useEffect, useState } from 'react';
import { useCafe } from '../../CafeProvider.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { ValidationMessage, fieldErrorProps } from '../../primitives/ValidationMessage.js';
import {
  DAY_LABELS,
  DEFAULT_INTERVAL,
  dayWindowsError,
  draftToHours,
  hoursDraftEqual,
  hoursDraftError,
  hoursToDraft,
  intervalOrderError,
  type HoursDraft,
} from './hours-draft.js';

export function WeeklyHoursCard() {
  const { cafe, patchSettings } = useCafe();
  const saved = hoursToDraft(cafe.hours);
  const [draft, setDraft] = useState<HoursDraft>(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(hoursToDraft(cafe.hours));
  }, [cafe.hours]);

  const dirty = !hoursDraftEqual(draft, saved);
  const valid = hoursDraftError(draft) === null;

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
      [day]: { intervals: [...prev[day].intervals, { ...DEFAULT_INTERVAL }] },
    }));
  }

  function removeInterval(day: WeekdayKey, index: number) {
    setDraft((prev) => ({
      ...prev,
      [day]: { intervals: prev[day].intervals.filter((_, i) => i !== index) },
    }));
  }

  function undo() {
    setDraft(saved);
    setError(null);
  }

  async function save() {
    if (!valid) return;
    setSaving(true);
    setError(null);
    try {
      await patchSettings({ hours: draftToHours(draft) });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard
      title="Weekly hours"
      description="Customers can only order ahead while you're open. Closed days take the day off the calendar."
      save={{
        label: 'Save hours',
        dirty,
        valid,
        saving,
        onSave: () => void save(),
        secondaryLabel: 'Undo',
        onSecondary: undo,
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {WEEKDAY_KEYS.map((day) => {
          const d = draft[day];
          const isOpen = d.intervals.length > 0;
          const dayError = isOpen ? dayWindowsError(d.intervals) : null;
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
                      size="small"
                    />
                  }
                  label={DAY_LABELS[day]}
                />
                {isOpen ? (
                  <Button size="small" startIcon={<AddIcon />} onClick={() => addInterval(day)}>
                    Add window
                  </Button>
                ) : null}
              </Box>
              {d.intervals.map((iv, index) => {
                const orderErr = intervalOrderError(iv.open, iv.close);
                const showOrder = Boolean(orderErr) && dirty;
                return (
                  <Box
                    key={`${day}-${index}`}
                    sx={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 1.5,
                      alignItems: 'flex-start',
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
                      sx={{ width: 130 }}
                      {...fieldErrorProps(showOrder ? orderErr : null)}
                      slotProps={{
                        htmlInput: { step: 300 },
                        inputLabel: { shrink: true },
                      }}
                    />
                    <TextField
                      label={d.intervals.length > 1 ? `Close ${index + 1}` : 'Close'}
                      type="time"
                      size="small"
                      value={iv.close}
                      onChange={(e) => updateInterval(day, index, { close: e.target.value })}
                      sx={{ width: 130 }}
                      {...fieldErrorProps(showOrder ? orderErr : null)}
                      slotProps={{
                        htmlInput: { step: 300 },
                        inputLabel: { shrink: true },
                      }}
                    />
                    {d.intervals.length > 1 ? (
                      <IconButton
                        aria-label={`Remove window ${index + 1}`}
                        size="small"
                        onClick={() => removeInterval(day, index)}
                        sx={{ mt: 0.5 }}
                      >
                        <DeleteOutlinedIcon fontSize="small" />
                      </IconButton>
                    ) : null}
                  </Box>
                );
              })}
              {dayError === 'These times overlap' && dirty ? (
                <Box sx={{ ml: { sm: 2 } }}>
                  <ValidationMessage>These times overlap</ValidationMessage>
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </SettingsCard>
  );
}
