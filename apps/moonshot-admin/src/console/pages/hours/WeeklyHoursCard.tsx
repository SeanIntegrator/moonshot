import { Alert, Box } from '@mui/material';
import { WEEKDAY_KEYS, type CafeHoursInterval, type WeekdayKey } from '@moonshot/types';
import { useEffect, useState } from 'react';
import { useCafe } from '../../CafeProvider.js';
import { localWeekdayKey } from '../overview/today-hours.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { HoursDayRow } from './HoursDayRow.js';
import {
  DEFAULT_INTERVAL,
  dayWindowsError,
  draftToHours,
  hoursDraftEqual,
  hoursDraftError,
  hoursToDraft,
  type HoursDraft,
} from './hours-draft.js';

export function WeeklyHoursCard() {
  const { cafe, patchSettings } = useCafe();
  const saved = hoursToDraft(cafe.hours);
  const [draft, setDraft] = useState<HoursDraft>(saved);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = localWeekdayKey(cafe.timezone, new Date());

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
      save={{
        label: 'Save hours',
        dirty,
        valid,
        saving,
        onSave: () => void save(),
        showUnsaved: false,
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <Box
        sx={{
          mx: { xs: -2, sm: -3 },
          mt: { xs: -2, sm: -3 },
        }}
      >
        {WEEKDAY_KEYS.map((day) => {
          const d = draft[day];
          const isOpen = d.intervals.length > 0;
          const dayError = isOpen ? dayWindowsError(d.intervals) : null;
          return (
            <HoursDayRow
              key={day}
              day={day}
              intervals={d.intervals}
              isToday={day === today}
              dirty={dirty}
              overlapError={dayError === 'These times overlap' && dirty}
              onToggle={(open) => setDayOpen(day, open)}
              onUpdate={(index, patch) => updateInterval(day, index, patch)}
              onAdd={() => addInterval(day)}
              onRemove={(index) => removeInterval(day, index)}
            />
          );
        })}
      </Box>
      {/* Last order-ahead buffer is not in cafe settings yet — omit the "N minutes before you close" control. */}
    </SettingsCard>
  );
}
