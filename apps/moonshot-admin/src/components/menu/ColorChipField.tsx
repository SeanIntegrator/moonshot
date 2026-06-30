import { Box, TextField, Typography } from '@mui/material';

type Props = {
  colorHex: string;
  chipLabel: string;
  onColorChange: (value: string) => void;
  onLabelChange: (value: string) => void;
  compact?: boolean;
};

/** KDS chip colour + short label — baristas map colours to brands (e.g. pink = almond). */
export function ColorChipField({
  colorHex,
  chipLabel,
  onColorChange,
  onLabelChange,
  compact = false,
}: Props) {
  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: compact ? 'center' : 'flex-start', flexWrap: 'wrap' }}>
      <TextField
        label="KDS colour"
        type="color"
        size="small"
        value={colorHex || '#cccccc'}
        onChange={(e) => onColorChange(e.target.value)}
        sx={{ width: compact ? 72 : 96 }}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="Chip label"
        size="small"
        value={chipLabel}
        onChange={(e) => onLabelChange(e.target.value.slice(0, 4))}
        placeholder="Oa"
        helperText={compact ? undefined : 'Short text on KDS pills'}
        sx={{ width: compact ? 72 : 100 }}
      />
      <Box
        sx={{
          px: 1.25,
          py: 0.5,
          borderRadius: 999,
          bgcolor: colorHex || '#ccc',
          color: '#111',
          fontSize: 12,
          fontWeight: 700,
          minWidth: 32,
          textAlign: 'center',
        }}
      >
        {chipLabel || '—'}
      </Box>
    </Box>
  );
}
