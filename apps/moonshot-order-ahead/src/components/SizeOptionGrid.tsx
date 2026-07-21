import type { NormalisedItemSize } from '@moonshot/types';
import { Box, Typography } from '@mui/material';
import { formatPriceTag } from '../lib/format.js';

type Props = {
  sizes: NormalisedItemSize[];
  currency: string;
  selectedId: string | null;
  onSelect: (sizeId: string) => void;
};

/** Required single-select size picker — absolute prices per size. */
export function SizeOptionGrid({ sizes, currency, selectedId, onSelect }: Props) {
  if (sizes.length === 0) return null;

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        Size
      </Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        {sizes.map((size) => {
          const selected = selectedId === size.id;
          const price = formatPriceTag(size.priceMinor, currency);
          return (
            <Box
              key={size.id}
              component="button"
              type="button"
              onClick={() => onSelect(size.id)}
              sx={{
                textAlign: 'left',
                p: 1.25,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1.25,
                bgcolor: selected ? 'action.selected' : 'background.paper',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'text.primary',
                appearance: 'none',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {size.colorHex ? (
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      bgcolor: size.colorHex,
                      border: 1,
                      borderColor: 'divider',
                    }}
                  />
                ) : null}
                <Typography variant="body2" fontWeight={600}>
                  {size.name}
                </Typography>
              </Box>
              {price ? (
                <Typography variant="caption" color="text.secondary">
                  {price}
                </Typography>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
