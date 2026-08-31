import type {
  BaseThemeId,
  Cafe,
  CafeBrandOverrides,
  CafeHoursInterval,
  LastOrderBufferMinutes,
  WeekdayKey,
} from '@moonshot/types';
import {
  HEADING_FONT_CATALOG,
  WEEKDAY_KEYS,
  currentLastOrderSlotHhMm,
  isHexColor,
  isLastOrderBufferMinutes,
  normalizeHex,
} from '@moonshot/domain';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { OrderAheadThemePreview } from '../../console/pages/brand/OrderAheadThemePreview.js';
import { BRAND_COLOUR_PRESETS, THEME_PACKS } from '../../console/pages/brand/brand-presets.js';
import { HoursDayRow } from '../../console/pages/hours/HoursDayRow.js';
import { LAST_ORDER_BUFFER_OPTIONS } from '../../console/pages/hours/last-order-buffer.js';
import {
  DEFAULT_INTERVAL,
  dayWindowsError,
  draftToHours,
  hoursDraftError,
  hoursToDraft,
  type HoursDraft,
} from '../../console/pages/hours/hours-draft.js';
import { localWeekdayKey } from '../../console/pages/overview/today-hours.js';
import { buttonLoader } from '../../console/primitives/button-loader.js';
import { fieldErrorProps } from '../../console/primitives/ValidationMessage.js';
import { adminSaveCafeSettings, fetchPublicCafe } from '../../lib/admin-api.js';

type Props = {
  token: string;
  cafeSlug: string;
  cafeName: string;
  busy: boolean;
  onBusy: (busy: boolean) => void;
  onSaved: () => void;
  onError: (message: string) => void;
};

function asBuffer(value: number): LastOrderBufferMinutes {
  return isLastOrderBufferMinutes(value) ? value : 20;
}

function sameHex(a: string, b: string): boolean {
  const na = a.trim() ? normalizeHex(a) : '';
  const nb = b.trim() ? normalizeHex(b) : '';
  return (na ?? a.trim().toLowerCase()) === (nb ?? b.trim().toLowerCase());
}

function brandFromCafe(cafe: Cafe): {
  themeId: BaseThemeId;
  color: string;
  headingFontId: string;
} {
  const brand = cafe.themeOverrides?.brand;
  return {
    themeId: cafe.themeId,
    color: typeof brand?.color === 'string' ? brand.color : '',
    headingFontId: typeof brand?.headingFontId === 'string' ? brand.headingFontId : '',
  };
}

/**
 * Combined brand + hours confirmation during onboarding.
 * Does not use CafeProvider — loads public café and saves via onboarding endpoint.
 */
export function CafeSettingsStep({
  token,
  cafeSlug,
  cafeName,
  busy,
  onBusy,
  onSaved,
  onError,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cafe, setCafe] = useState<Cafe | null>(null);

  const [themeId, setThemeId] = useState<BaseThemeId>('organic');
  const [color, setColor] = useState('');
  const [headingFontId, setHeadingFontId] = useState('');
  const [draft, setDraft] = useState<HoursDraft | null>(null);
  const [buffer, setBuffer] = useState<LastOrderBufferMinutes>(20);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    fetchPublicCafe(cafeSlug)
      .then((payload) => {
        if (cancelled) return;
        const c = payload.cafe;
        setCafe(c);
        const brand = brandFromCafe(c);
        setThemeId(brand.themeId);
        setColor(brand.color);
        setHeadingFontId(brand.headingFontId);
        setDraft(hoursToDraft(c.hours));
        setBuffer(asBuffer(c.lastOrderBufferMinutes));
      })
      .catch((e) => {
        if (cancelled) return;
        setLoadError(e instanceof Error ? e.message : 'Could not load café settings');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cafeSlug]);

  const colourError =
    color.trim() && !isHexColor(color) ? 'Enter a #hex colour, or leave blank for pack default.' : null;
  const hoursError = draft ? hoursDraftError(draft) : 'Loading…';
  const valid = colourError === null && hoursError === null && draft != null;

  const previewColor = color.trim() && isHexColor(color) ? color.trim() : null;
  const previewFont = headingFontId.trim() || null;
  const today = cafe ? localWeekdayKey(cafe.timezone, new Date()) : null;

  function setDayOpen(day: WeekdayKey, open: boolean) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [day]: {
          intervals: open
            ? prev[day].intervals.length > 0
              ? prev[day].intervals
              : [{ ...DEFAULT_INTERVAL }]
            : [],
        },
      };
    });
  }

  function updateInterval(day: WeekdayKey, index: number, patch: Partial<CafeHoursInterval>) {
    setDraft((prev) => {
      if (!prev) return prev;
      const intervals = prev[day].intervals.map((iv, i) => (i === index ? { ...iv, ...patch } : iv));
      return { ...prev, [day]: { intervals } };
    });
  }

  function addInterval(day: WeekdayKey) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [day]: { intervals: [...prev[day].intervals, { ...DEFAULT_INTERVAL }] },
      };
    });
  }

  function removeInterval(day: WeekdayKey, index: number) {
    setDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [day]: { intervals: prev[day].intervals.filter((_, i) => i !== index) },
      };
    });
  }

  function copyWeekdaysFromMonday() {
    setDraft((prev) => {
      if (!prev) return prev;
      const mon = prev.mon.intervals.map((iv) => ({ ...iv }));
      return {
        ...prev,
        tue: { intervals: mon.map((iv) => ({ ...iv })) },
        wed: { intervals: mon.map((iv) => ({ ...iv })) },
        thu: { intervals: mon.map((iv) => ({ ...iv })) },
        fri: { intervals: mon.map((iv) => ({ ...iv })) },
      };
    });
  }

  async function save() {
    if (!valid || !draft) return;
    onBusy(true);
    try {
      const brand: CafeBrandOverrides = {
        color: color.trim() ? color.trim() : null,
        headingFontId: headingFontId.trim() ? headingFontId.trim() : null,
      };
      await adminSaveCafeSettings(token, {
        themeId,
        brand,
        hours: draftToHours(draft),
        lastOrderBufferMinutes: buffer,
      });
      onSaved();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Could not save café settings');
    } finally {
      onBusy(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <CircularProgress size={28} sx={{ mb: 2 }} />
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Loading your café settings…
        </Typography>
      </Box>
    );
  }

  if (loadError || !draft || !cafe) {
    return (
      <Alert severity="error">
        {loadError ?? 'Could not load café settings'}
      </Alert>
    );
  }

  const exampleSlot = currentLastOrderSlotHhMm({
    hours: draftToHours(draft),
    timezone: cafe.timezone,
    overrides: cafe.hoursOverrides,
    lastOrderBufferMinutes: buffer,
  });

  return (
    <Box>
      <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>
        Set up {cafeName}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
        Choose how your order page looks and confirm when you’re open. Defaults are a starting
        point — please check them before continuing.
      </Typography>

      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Brand
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gap: 2.5,
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            Pack
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {THEME_PACKS.map((pack) => {
              const selected = themeId === pack.id;
              return (
                <Box
                  key={pack.id}
                  component="button"
                  type="button"
                  onClick={() => setThemeId(pack.id)}
                  sx={(theme) => ({
                    textAlign: 'left',
                    p: 1.25,
                    border: `1px solid ${selected ? theme.console.ink : theme.console.card.border}`,
                    borderRadius: 1,
                    bgcolor: selected ? theme.console.readonly.fill : 'transparent',
                    cursor: 'pointer',
                    font: 'inherit',
                    color: 'inherit',
                  })}
                >
                  <Typography sx={{ fontWeight: 700 }}>{pack.label}</Typography>
                  <Typography variant="caption">{pack.blurb}</Typography>
                </Box>
              );
            })}
          </Box>

          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 2, mb: 1 }}>
            Colour
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            {BRAND_COLOUR_PRESETS.map((hex) => {
              const active = sameHex(color, hex);
              return (
                <Box
                  key={hex}
                  component="button"
                  type="button"
                  aria-label={hex}
                  aria-pressed={active}
                  onClick={() => setColor(hex)}
                  sx={(theme) => ({
                    width: 28,
                    height: 28,
                    p: 0,
                    borderRadius: '50%',
                    bgcolor: hex,
                    border: `2px solid ${active ? theme.console.ink : '#fff'}`,
                    boxShadow: `0 0 0 1px ${theme.console.card.border}`,
                    cursor: 'pointer',
                  })}
                />
              );
            })}
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, mt: 1.25 }}>
            <TextField
              label="Hex"
              size="small"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#396a5b"
              sx={{ width: 140 }}
              {...fieldErrorProps(colourError)}
            />
            <Button size="small" color="inherit" onClick={() => setColor('')} disabled={!color.trim()}>
              Reset
            </Button>
          </Box>

          <FormControl size="small" sx={{ mt: 2, maxWidth: 280 }} fullWidth>
            <InputLabel id="onboard-heading-font">Heading font</InputLabel>
            <Select
              labelId="onboard-heading-font"
              label="Heading font"
              value={headingFontId}
              onChange={(e) => setHeadingFontId(String(e.target.value))}
            >
              <MenuItem value="">
                <em>Pack default</em>
              </MenuItem>
              {HEADING_FONT_CATALOG.map((f) => (
                <MenuItem key={f.id} value={f.id}>
                  {f.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1 }}>
            Preview
          </Typography>
          <OrderAheadThemePreview
            themeId={themeId}
            brandColor={previewColor}
            headingFontId={previewFont}
            variant="home"
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="subtitle2">Opening hours</Typography>
        <Button size="small" onClick={copyWeekdaysFromMonday}>
          Copy Mon → Fri
        </Button>
      </Box>
      <Box
        sx={(theme) => ({
          border: `1px solid ${theme.console.card.border}`,
          borderRadius: 1.5,
          px: { xs: 1.5, sm: 2 },
          mb: 2,
        })}
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
              dirty
              overlapError={dayError === 'These times overlap'}
              onToggle={(open) => setDayOpen(day, open)}
              onUpdate={(index, patch) => updateInterval(day, index, patch)}
              onAdd={() => addInterval(day)}
              onRemove={(index) => removeInterval(day, index)}
            />
          );
        })}
      </Box>

      <Typography variant="body2" sx={{ mb: 2 }}>
        Last order-ahead slot closes
        <FormControl size="small" sx={{ mx: 1, minWidth: 140, verticalAlign: 'middle' }}>
          <Select
            value={buffer}
            onChange={(e) => setBuffer(asBuffer(Number(e.target.value)))}
            aria-label="Last order-ahead buffer"
          >
            {LAST_ORDER_BUFFER_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        before you close.
        {exampleSlot ? (
          <Typography component="span" variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
            Right now that&apos;s {exampleSlot}.
          </Typography>
        ) : null}
      </Typography>

      {hoursError ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {hoursError}
        </Alert>
      ) : null}

      <Button
        variant="contained"
        fullWidth
        size="large"
        disabled={!valid || busy}
        startIcon={buttonLoader(busy)}
        onClick={() => void save()}
      >
        {busy ? 'Saving…' : 'Save & continue'}
      </Button>
    </Box>
  );
}
