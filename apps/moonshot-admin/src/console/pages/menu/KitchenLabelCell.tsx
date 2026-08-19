import { Box } from '@mui/material';
import { kitchenAbbrev } from './item-sidebar.js';

type Props = {
  name: string;
  colorHex?: string | null;
  chipLabel?: string | null;
  editable?: boolean;
  onColorChange?: (value: string) => void;
};

/** Milk carton colour swatch — abbrev is derived from the option name, not edited here. */
export function KitchenLabelCell({
  name,
  colorHex,
  chipLabel,
  editable = false,
  onColorChange,
}: Props) {
  const fill = colorHex || '#e8e8e8';
  const abbrev = kitchenAbbrev(name, chipLabel);

  return (
    <Box
      sx={{
        position: 'relative',
        width: 32,
        height: 32,
        borderRadius: '50%',
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
  );
}
