import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { Box, IconButton, Typography } from '@mui/material';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
};

export function QuantityStepper({ value, onChange, min = 1 }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 999,
        px: 1.5,
        py: 0.75,
      }}
    >
      <IconButton
        size="small"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        aria-label="Decrease quantity"
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography fontWeight={600} sx={{ minWidth: 20, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </Typography>
      <IconButton
        size="small"
        onClick={() => onChange(value + 1)}
        aria-label="Increase quantity"
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          '&:hover': { bgcolor: 'secondary.main' },
        }}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
