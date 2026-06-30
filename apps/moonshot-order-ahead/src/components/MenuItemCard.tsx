import type { NormalisedMenuItem } from '@moonshot/types';
import { Box, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatFromPrice, formatPriceTag } from '../lib/format.js';
import { menuItemListPriceMinor } from '../lib/menu-price-utils.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { MenuItemImage } from './MenuItemImage.js';

type Props = {
  item: NormalisedMenuItem;
  qty?: number;
};

export function MenuItemCard({ item, qty = 0 }: Props) {
  const cafePath = useCafePath();
  const hasSizes = (item.sizes?.length ?? 0) > 0;
  const listMinor = menuItemListPriceMinor(item);
  const priceLabel = hasSizes
    ? formatFromPrice(listMinor, item.currency)
    : formatPriceTag(listMinor, item.currency);

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component={RouterLink}
        to={cafePath(`/order/item/${item.id}`)}
        className="pressable-card"
        sx={{
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.25,
          overflow: 'hidden',
          bgcolor: 'background.paper',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <MenuItemImage
          src={item.imageUrl}
          alt={item.name}
          aspectRatio="1"
          borderRadius={0}
          loading="lazy"
        />
        <Box sx={{ p: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={600} sx={{ minWidth: 0 }}>
            {item.name}
          </Typography>
          {priceLabel ? (
            <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {priceLabel}
            </Typography>
          ) : null}
        </Box>
      </Box>
      <Box
        aria-hidden={qty === 0}
        sx={{
          position: 'absolute',
          bottom: 52,
          right: 8,
          width: 32,
          height: 32,
          borderRadius: '50%',
          bgcolor: qty > 0 ? 'primary.main' : 'transparent',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          fontWeight: 700,
          opacity: qty > 0 ? 1 : 0,
          transform: qty > 0 ? 'scale(1)' : 'scale(0.6)',
          transition: 'opacity 180ms ease, transform 180ms ease, background-color 180ms ease',
          pointerEvents: 'none',
        }}
      >
        {qty > 0 ? qty : null}
      </Box>
    </Box>
  );
}
