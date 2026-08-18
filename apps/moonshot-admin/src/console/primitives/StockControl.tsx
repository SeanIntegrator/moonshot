import { Box, Typography } from '@mui/material';

export type StockAvailability = 'in' | 'out_today' | 'out';

const OPTIONS: ReadonlyArray<{ value: StockAvailability; label: string }> = [
  { value: 'in', label: 'In stock' },
  { value: 'out_today', label: 'Out today' },
  { value: 'out', label: 'Out' },
];

type Props = {
  value: StockAvailability;
  onChange: (next: StockAvailability) => void;
  disabled?: boolean;
  /** Food is binary — hide Out today. */
  states?: readonly StockAvailability[];
};

export function StockControl({ value, onChange, disabled, states }: Props) {
  const visible = states ?? OPTIONS.map((o) => o.value);
  return (
    <Box
      role="radiogroup"
      aria-label="Availability"
      sx={(theme) => ({
        display: 'flex',
        borderRadius: 1,
        overflow: 'hidden',
        border: `1px solid ${theme.console.card.border}`,
      })}
    >
      {OPTIONS.filter((opt) => visible.includes(opt.value)).map((opt) => {
        const selected = opt.value === value;
        return (
          <Box
            key={opt.value}
            component="button"
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            sx={(theme) => ({
              appearance: 'none',
              border: 0,
              cursor: disabled ? 'default' : 'pointer',
              px: 1.25,
              py: 0.75,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              lineHeight: 1.2,
              color: selected
                ? opt.value === 'in'
                  ? theme.console.ink
                  : '#fff'
                : theme.console.stock.unselected,
              bgcolor: selected
                ? opt.value === 'in'
                  ? theme.console.stock.inFill
                  : opt.value === 'out_today'
                    ? theme.console.stock.outToday
                    : theme.console.stock.out
                : 'transparent',
              '&:disabled': { opacity: 0.5 },
            })}
          >
            <Typography component="span" sx={{ font: 'inherit', color: 'inherit' }}>
              {opt.label}
            </Typography>
          </Box>
        );
      })}
    </Box>
  );
}
