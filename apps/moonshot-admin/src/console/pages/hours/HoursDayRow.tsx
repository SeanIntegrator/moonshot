import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { Box, Button, InputAdornment, Switch, TextField, Typography } from '@mui/material';
import type { CafeHoursInterval, WeekdayKey } from '@moonshot/types';
import { ValidationMessage, fieldErrorProps } from '../../primitives/ValidationMessage.js';
import { DAY_LABELS, intervalOrderError } from './hours-draft.js';

type Props = {
  day: WeekdayKey;
  intervals: CafeHoursInterval[];
  isToday: boolean;
  dirty: boolean;
  onToggle: (open: boolean) => void;
  onUpdate: (index: number, patch: Partial<CafeHoursInterval>) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  overlapError: boolean;
};

function TimeField({
  value,
  ariaLabel,
  error,
  onChange,
}: {
  value: string;
  ariaLabel: string;
  error: string | null;
  onChange: (next: string) => void;
}) {
  return (
    <TextField
      type="time"
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={ariaLabel}
      {...fieldErrorProps(error)}
      sx={{
        width: 132,
        '& input::-webkit-calendar-picker-indicator': { display: 'none' },
      }}
      slotProps={{
        htmlInput: { step: 300 },
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <AccessTimeIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

export function HoursDayRow({
  day,
  intervals,
  isToday,
  dirty,
  onToggle,
  onUpdate,
  onAdd,
  onRemove,
  overlapError,
}: Props) {
  const isOpen = intervals.length > 0;

  return (
    <Box
      sx={(theme) => ({
        display: 'grid',
        gridTemplateColumns: {
          xs: 'auto 1fr',
          md: 'auto minmax(148px, 180px) minmax(280px, 1fr) auto',
        },
        columnGap: 2,
        rowGap: 1.25,
        alignItems: 'center',
        py: 2.25,
        px: { xs: 2, sm: 3 },
        borderBottom: `1px solid ${theme.console.hairline}`,
      })}
    >
      <Switch checked={isOpen} onChange={(_, v) => onToggle(v)} size="small" />
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.75 }}>
        <Typography
          sx={(theme) => ({
            fontWeight: 700,
            color: isOpen ? theme.console.ink : theme.console.muted,
          })}
        >
          {DAY_LABELS[day]}
        </Typography>
        {isToday ? (
          <Box
            sx={(theme) => ({
              px: 0.85,
              py: 0.15,
              borderRadius: 999,
              bgcolor: theme.console.status.takingOrders,
              color: '#fff',
              fontSize: 11,
              fontWeight: 600,
              lineHeight: 1.4,
            })}
          >
            today
          </Box>
        ) : null}
        {!isOpen ? (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Closed — no online ordering
          </Typography>
        ) : null}
      </Box>
      {isOpen ? (
        <>
          {intervals.map((iv, index) => {
            const orderErr = dirty ? intervalOrderError(iv.open, iv.close) : null;
            return (
              <Box
                key={`${day}-${index}`}
                sx={{
                  gridColumn: { xs: '1 / -1', md: '3' },
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: 1,
                  pl: { md: index > 0 ? 2 : 0 },
                }}
              >
                <TimeField
                  value={iv.open}
                  ariaLabel={`${DAY_LABELS[day]} open ${index + 1}`}
                  error={orderErr}
                  onChange={(open) => onUpdate(index, { open })}
                />
                <Typography variant="body2">to</Typography>
                <TimeField
                  value={iv.close}
                  ariaLabel={`${DAY_LABELS[day]} close ${index + 1}`}
                  error={orderErr}
                  onChange={(close) => onUpdate(index, { close })}
                />
                {intervals.length > 1 ? (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => onRemove(index)}
                    sx={(theme) => ({ color: theme.console.stock.out, minWidth: 0, px: 0.5 })}
                  >
                    remove
                  </Button>
                ) : null}
              </Box>
            );
          })}
          <Box
            sx={{
              gridColumn: { xs: '1 / -1', md: '4' },
              gridRow: { md: '1' },
              justifySelf: { md: 'end' },
            }}
          >
            <Button variant="text" size="small" onClick={onAdd} sx={{ whiteSpace: 'nowrap' }}>
              + Split shift
            </Button>
          </Box>
        </>
      ) : (
        <Box sx={{ display: { xs: 'none', md: 'block' } }} />
      )}
      {overlapError ? (
        <Box sx={{ gridColumn: { md: '3 / -1' } }}>
          <ValidationMessage>These times overlap</ValidationMessage>
        </Box>
      ) : null}
    </Box>
  );
}
