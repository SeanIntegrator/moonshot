import { Box, FormControlLabel, Switch, Typography } from '@mui/material';
import type { ModifierSelectionType } from '@moonshot/types';
import { customersPickLabel } from './modifier-list-copy.js';

type Props = {
  selectionType: ModifierSelectionType;
  required: boolean;
  locked?: boolean;
  onSelectionType: (next: ModifierSelectionType) => void;
  onRequired: (next: boolean) => void;
};

export function ModifierListHeader({
  selectionType,
  required,
  locked = false,
  onSelectionType,
  onRequired,
}: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 1.5,
        justifyContent: 'flex-end',
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        Customers pick
      </Typography>
      {locked ? (
        <>
          <Typography sx={{ fontWeight: 600 }}>{customersPickLabel(selectionType)}</Typography>
          <Typography variant="body2">{required ? 'Required choice' : 'Optional'}</Typography>
        </>
      ) : (
        <>
          <Box
            role="group"
            aria-label="Customers pick"
            sx={(theme) => ({
              display: 'flex',
              borderRadius: 999,
              overflow: 'hidden',
              border: `1px solid ${theme.console.card.border}`,
            })}
          >
            {(
              [
                { value: 'single', label: 'Just one' },
                { value: 'multi', label: 'Any number' },
              ] as const
            ).map((opt) => {
              const on = selectionType === opt.value;
              return (
                <Box
                  key={opt.value}
                  component="button"
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSelectionType(opt.value)}
                  sx={(theme) => ({
                    appearance: 'none',
                    cursor: 'pointer',
                    px: 1.35,
                    py: 0.55,
                    fontFamily: 'inherit',
                    fontSize: 13,
                    fontWeight: 600,
                    border: 0,
                    bgcolor: on ? theme.console.ink : '#fff',
                    color: on ? '#fff' : theme.console.ink,
                  })}
                >
                  {opt.label}
                </Box>
              );
            })}
          </Box>
          <FormControlLabel
            sx={{ mr: 0 }}
            control={<Switch checked={required} onChange={(_, v) => onRequired(v)} size="small" />}
            label="Required choice"
          />
        </>
      )}
    </Box>
  );
}
