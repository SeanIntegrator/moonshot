import type { NormalisedItemSize } from '@moonshot/types';
import { Box, Typography } from '@mui/material';
import { formatPriceTag } from '../lib/format.js';
import { OptionColorDot, OptionTile } from './ui/OptionTile.js';

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
            <OptionTile key={size.id} selected={selected} onClick={() => onSelect(size.id)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {size.colorHex ? (
                  <OptionColorDot sx={{ bgcolor: size.colorHex }} />
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
            </OptionTile>
          );
        })}
      </Box>
    </Box>
  );
}
