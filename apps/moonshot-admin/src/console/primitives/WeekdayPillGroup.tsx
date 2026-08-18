import { Box } from '@mui/material';
import { WEEKDAY_PILLS_LONG, type WeekdayPillOption } from './weekday-pills.js';

export type { WeekdayPillOption };
export { WEEKDAY_PILLS_KEYS, WEEKDAY_PILLS_LONG } from './weekday-pills.js';

type Props = {
  value: readonly string[];
  onChange: (next: string[]) => void;
  options?: readonly WeekdayPillOption[];
  disabled?: boolean;
};

export function WeekdayPillGroup({
  value,
  onChange,
  options = WEEKDAY_PILLS_LONG,
  disabled,
}: Props) {
  const selected = new Set(value);

  function toggle(nextValue: string) {
    if (selected.has(nextValue)) {
      onChange(value.filter((v) => v !== nextValue));
    } else {
      onChange([...value, nextValue]);
    }
  }

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {options.map((opt) => {
        const on = selected.has(opt.value);
        return (
          <Box
            key={opt.value}
            component="button"
            type="button"
            disabled={disabled}
            aria-pressed={on}
            onClick={() => toggle(opt.value)}
            sx={(theme) => ({
              appearance: 'none',
              cursor: disabled ? 'default' : 'pointer',
              px: 1.25,
              py: 0.6,
              borderRadius: 999,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              border: `1px solid ${on ? theme.console.ink : theme.console.card.border}`,
              bgcolor: on ? theme.console.ink : 'transparent',
              color: on ? '#fff' : theme.console.ink,
              '&:disabled': { opacity: 0.5 },
            })}
          >
            {opt.label}
          </Box>
        );
      })}
    </Box>
  );
}
