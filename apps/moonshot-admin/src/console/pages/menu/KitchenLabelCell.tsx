import { Box, TextField } from '@mui/material';
import { kitchenAbbrev } from './item-sidebar.js';

type Props = {
  name: string;
  colorHex?: string | null;
  chipLabel?: string | null;
  editable?: boolean;
  onColorChange?: (value: string) => void;
  onLabelChange?: (value: string) => void;
};

export function KitchenLabelCell({
  name,
  colorHex,
  chipLabel,
  editable = false,
  onColorChange,
  onLabelChange,
}: Props) {
  const fill = colorHex || '#e8e8e8';
  const abbrev = kitchenAbbrev(name, chipLabel);

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box
        sx={{
          position: 'relative',
          width: 28,
          height: 28,
          borderRadius: 1,
          bgcolor: fill,
          border: '1px solid rgba(17, 24, 39, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          flex: '0 0 auto',
          overflow: 'hidden',
        }}
      >
        {abbrev}
        {editable && onColorChange ? (
          <Box
            component="input"
            type="color"
            value={fill}
            aria-label={`${name} kitchen colour`}
            onChange={(e) => onColorChange(e.target.value)}
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              cursor: 'pointer',
              border: 0,
              p: 0,
              width: '100%',
              height: '100%',
            }}
          />
        ) : null}
      </Box>
      {editable && onLabelChange ? (
        <TextField
          size="small"
          value={chipLabel ?? ''}
          placeholder={abbrev}
          onChange={(e) => onLabelChange(e.target.value.slice(0, 12))}
          aria-label={`${name} kitchen label`}
          sx={{ width: 64 }}
        />
      ) : null}
    </Box>
  );
}
