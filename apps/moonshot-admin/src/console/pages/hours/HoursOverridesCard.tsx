import { Box, Button, Link, TextField, Typography } from '@mui/material';
import type { CafeHoursInterval, CafeHoursOverride } from '@moonshot/types';
import { useState } from 'react';
import { useCafe } from '../../CafeProvider.js';
import { formatUkShortDate } from '../../../lib/format.js';
import { buttonLoader } from '../../primitives/button-loader.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { useToast } from '../../primitives/ToastProvider.js';
import { DEFAULT_INTERVAL, dayWindowsError } from './hours-draft.js';

function overrideDateLabel(date: string, timeZone: string): string {
  return formatUkShortDate(new Date(`${date}T12:00:00Z`), timeZone);
}

function OverrideEditor({
  initial,
  onCancel,
  onSave,
}: {
  initial: CafeHoursOverride | null;
  onCancel: () => void;
  onSave: (next: CafeHoursOverride) => Promise<void>;
}) {
  const toast = useToast();
  const [date, setDate] = useState(initial?.date ?? '');
  const [label, setLabel] = useState(initial?.label ?? '');
  const [closed, setClosed] = useState(initial?.closed ?? true);
  const [intervals, setIntervals] = useState<CafeHoursInterval[]>(
    initial && !initial.closed && initial.intervals.length > 0
      ? initial.intervals
      : [{ ...DEFAULT_INTERVAL }],
  );
  const [saving, setSaving] = useState(false);

  const intervalError = closed ? null : dayWindowsError(intervals);
  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && (closed || intervalError === null);

  async function save() {
    if (!valid) return;
    setSaving(true);
    try {
      await onSave({
        date,
        label: label.trim() || null,
        closed,
        intervals: closed ? [] : intervals,
      });
    } catch (e) {
      toast({ severity: 'error', message: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
      <TextField
        type="date"
        size="small"
        label="Date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        slotProps={{ inputLabel: { shrink: true } }}
      />
      <TextField
        size="small"
        label="Label (optional)"
        placeholder="bank holiday"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
      />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button size="small" variant={closed ? 'contained' : 'outlined'} onClick={() => setClosed(true)}>
          Closed
        </Button>
        <Button size="small" variant={!closed ? 'contained' : 'outlined'} onClick={() => setClosed(false)}>
          Custom hours
        </Button>
      </Box>
      {!closed
        ? intervals.map((iv, index) => (
            <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <TextField
                type="time"
                size="small"
                value={iv.open}
                onChange={(e) =>
                  setIntervals((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, open: e.target.value } : row)),
                  )
                }
                sx={{ width: 120 }}
              />
              <Typography variant="body2">to</Typography>
              <TextField
                type="time"
                size="small"
                value={iv.close}
                onChange={(e) =>
                  setIntervals((prev) =>
                    prev.map((row, i) => (i === index ? { ...row, close: e.target.value } : row)),
                  )
                }
                sx={{ width: 120 }}
              />
            </Box>
          ))
        : null}
      {intervalError ? (
        <Typography variant="caption" color="error">
          {intervalError}
        </Typography>
      ) : null}
      <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
        <Button size="small" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          size="small"
          variant="contained"
          onClick={() => void save()}
          disabled={!valid || saving}
          startIcon={buttonLoader(saving)}
        >
          {saving ? 'Saving…' : 'Save date'}
        </Button>
      </Box>
    </Box>
  );
}

export function HoursOverridesCard() {
  const { cafe, saveHoursOverride, removeHoursOverride } = useCafe();
  const toast = useToast();
  const [editing, setEditing] = useState<CafeHoursOverride | null | 'new'>(null);
  const [busyDate, setBusyDate] = useState<string | null>(null);

  const rows = [...cafe.hoursOverrides].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <SettingsCard title="One-off changes">
      {rows.length === 0 && editing === null ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
          Bank holidays and one-off hours.
        </Typography>
      ) : null}
      {rows.map((row) => (
        <Box
          key={row.date}
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 1,
            alignItems: 'flex-start',
            py: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography sx={{ fontWeight: 600 }}>
              {overrideDateLabel(row.date, cafe.timezone)}
              {row.label ? ` · ${row.label}` : ''}
            </Typography>
            <Typography
              variant="body2"
              sx={{ color: row.closed ? 'error.main' : 'text.secondary' }}
            >
              {row.closed
                ? 'Closed'
                : row.intervals.map((iv) => `${iv.open} – ${iv.close}`).join(' and ')}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => setEditing(row)}
              disabled={busyDate === row.date}
            >
              edit
            </Link>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={() => {
                setBusyDate(row.date);
                void removeHoursOverride(row.date)
                  .catch((e) => {
                    toast({
                      severity: 'error',
                      message: e instanceof Error ? e.message : 'Could not remove date',
                    });
                  })
                  .finally(() => setBusyDate(null));
              }}
              disabled={busyDate === row.date}
            >
              remove
            </Link>
          </Box>
        </Box>
      ))}
      {editing !== null ? (
        <Box sx={{ mt: 1.5 }}>
          <OverrideEditor
            key={editing === 'new' ? 'new' : editing.date}
            initial={editing === 'new' ? null : editing}
            onCancel={() => setEditing(null)}
            onSave={async (next) => {
              const previousDate = editing === 'new' ? null : editing.date;
              await saveHoursOverride(next);
              // Upsert keys by date; drop the old row so a date change is a move, not a copy.
              if (previousDate && previousDate !== next.date) {
                await removeHoursOverride(previousDate);
              }
              setEditing(null);
            }}
          />
        </Box>
      ) : (
        <Button
          variant="outlined"
          size="small"
          sx={{ mt: 1.5, borderStyle: 'dashed' }}
          onClick={() => setEditing('new')}
        >
          + Add a date
        </Button>
      )}
    </SettingsCard>
  );
}
