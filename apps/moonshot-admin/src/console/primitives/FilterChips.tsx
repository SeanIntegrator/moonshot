import { Box } from '@mui/material';

export type FilterChipOption = { value: string; label: string };

type Props = {
  value: string;
  options: readonly FilterChipOption[];
  onChange: (next: string) => void;
};

export function FilterChips({ value, options, onChange }: Props) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
      {options.map((opt) => {
        const on = opt.value === value;
        return (
          <Box
            key={opt.value}
            component="button"
            type="button"
            aria-pressed={on}
            onClick={() => onChange(opt.value)}
            sx={(theme) => ({
              appearance: 'none',
              cursor: 'pointer',
              px: 1.5,
              py: 0.7,
              borderRadius: 999,
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 600,
              border: `1px solid ${on ? theme.console.ink : theme.console.card.border}`,
              bgcolor: on ? theme.console.ink : '#fff',
              color: on ? '#fff' : theme.console.ink,
            })}
          >
            {opt.label}
          </Box>
        );
      })}
    </Box>
  );
}
