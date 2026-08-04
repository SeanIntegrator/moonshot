import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { Box, IconButton, Typography } from '@mui/material';
import { sxRadius } from '../theme/radii.js';

type Props = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  disabled?: boolean;
};

export function QuantityStepper({ value, onChange, min = 1, disabled = false }: Props) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: sxRadius('pill'),
        px: 1.5,
        py: 0.75,
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <IconButton
        size="small"
        disableRipple
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        aria-label="Decrease quantity"
        sx={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography
        sx={{
          fontWeight: 600,
          minWidth: 20,
          textAlign: 'center',
          fontVariantNumeric: 'tabular-nums'
        }}>
        {value}
      </Typography>
      <IconButton
        size="small"
        disableRipple
        onClick={() => onChange(value + 1)}
        disabled={disabled}
        aria-label="Increase quantity"
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          WebkitTapHighlightColor: 'transparent',
          // Keep fill stable — MUI hover/active otherwise washes icon + bg to white on touch.
          '&:hover': { bgcolor: 'primary.main' },
          '&:active': { bgcolor: 'primary.main' },
          '&.Mui-focusVisible': { bgcolor: 'primary.main' },
          '&.Mui-disabled': { bgcolor: 'action.disabledBackground', color: 'action.disabled' },
        }}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Box>
  );
}
