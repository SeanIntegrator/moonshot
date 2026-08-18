/**
 * Validate a one-off hours override body. Interval rules match weekly hours.
 */

import type { CafeHoursInterval, CafeHoursOverride } from '@moonshot/types';
import {
  cafeHoursIntervalsOverlap,
  hhMmToMinutes,
  normalizeCafeHoursIntervals,
  toHhMm,
  weekdayKeyFromIsoDate,
} from '@moonshot/domain';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const LABEL_MAX = 80;

export type HoursOverrideResult<T> = { ok: true; value: T } | { ok: false; error: string };

export function validateHoursIntervals(
  raw: unknown,
  field = 'intervals',
): HoursOverrideResult<CafeHoursInterval[]> {
  if (!Array.isArray(raw)) {
    return { ok: false, error: `${field} must be an array` };
  }
  for (const item of raw) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      return { ok: false, error: `${field} must be objects with open/close` };
    }
    const open = (item as { open?: unknown }).open;
    const close = (item as { close?: unknown }).close;
    if (typeof open !== 'string' || typeof close !== 'string') {
      return { ok: false, error: `${field} need open/close as HH:mm` };
    }
    const openNorm = toHhMm(open);
    const closeNorm = toHhMm(close);
    if (!openNorm || !closeNorm) {
      return { ok: false, error: `${field} need open/close as HH:mm` };
    }
    if (hhMmToMinutes(openNorm)! >= hhMmToMinutes(closeNorm)!) {
      return { ok: false, error: `${field} open must be before close` };
    }
  }
  const intervals = normalizeCafeHoursIntervals(raw);
  if (cafeHoursIntervalsOverlap(intervals)) {
    return { ok: false, error: `${field} must not overlap` };
  }
  return { ok: true, value: intervals };
}

export function validateHoursOverrideBody(raw: unknown): HoursOverrideResult<CafeHoursOverride> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, error: 'Override must be an object' };
  }
  const rec = raw as Record<string, unknown>;
  if (typeof rec.date !== 'string' || !ISO_DATE.test(rec.date) || !weekdayKeyFromIsoDate(rec.date)) {
    return { ok: false, error: 'date must be YYYY-MM-DD' };
  }
  const closed = rec.closed === true;

  let label: string | null = null;
  if (rec.label !== undefined && rec.label !== null) {
    if (typeof rec.label !== 'string') {
      return { ok: false, error: 'label must be a string or null' };
    }
    const trimmed = rec.label.trim();
    if (trimmed.length > LABEL_MAX) {
      return { ok: false, error: `label must be at most ${LABEL_MAX} characters` };
    }
    label = trimmed.length > 0 ? trimmed : null;
  }

  if (closed) {
    return { ok: true, value: { date: rec.date, label, closed: true, intervals: [] } };
  }

  const intervalsResult = validateHoursIntervals(rec.intervals);
  if (!intervalsResult.ok) return intervalsResult;
  if (intervalsResult.value.length === 0) {
    return { ok: false, error: 'Open days need at least one time range' };
  }
  return {
    ok: true,
    value: { date: rec.date, label, closed: false, intervals: intervalsResult.value },
  };
}

export function parseOverrideDateParam(raw: string): HoursOverrideResult<string> {
  if (!ISO_DATE.test(raw) || !weekdayKeyFromIsoDate(raw)) {
    return { ok: false, error: 'date must be YYYY-MM-DD' };
  }
  return { ok: true, value: raw };
}
