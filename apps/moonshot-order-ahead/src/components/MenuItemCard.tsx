import type { NormalisedMenuItem } from '@moonshot/types';
import { Box, Skeleton, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { formatFromPrice, formatPriceTag } from '../lib/format.js';
import { isMenuImageReady } from '../lib/menu-image-cache.js';
import { menuItemListPriceMinor } from '../lib/menu-price-utils.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { MenuItemImage } from './MenuItemImage.js';
import { PressableCard } from './ui/PressableCard.js';
import { QtyBadge } from './ui/QtyBadge.js';

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
  const [imageReady, setImageReady] = useState(() => isMenuImageReady(item.imageUrl));
  const handleReady = useCallback((ready: boolean) => setImageReady(ready), []);
  const badgeVisible = qty > 0 && imageReady;

  return (
    <Box sx={{ position: 'relative' }}>
      <PressableCard
        component={RouterLink}
        to={cafePath(`/order/item/${item.id}`)}
        sx={{ position: 'relative' }}
      >
        <MenuItemImage
          src={item.imageUrl}
          alt={item.name}
          aspectRatio="1"
          borderRadius={0}
          loading="eager"
          objectFit="cover"
          onReadyChange={handleReady}
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

        {/* Full-card skeleton until the thumbnail has decoded — avoids empty image → pop-in. */}
        {!imageReady && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              bgcolor: 'background.paper',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <Skeleton variant="rectangular" animation="wave" sx={{ aspectRatio: '1', width: '100%', flexShrink: 0 }} />
            <Box sx={{ p: 1.25, display: 'flex', justifyContent: 'space-between', gap: 0.5 }}>
              <Skeleton variant="text" animation="wave" width="60%" height={20} />
              <Skeleton variant="text" animation="wave" width={40} height={16} />
            </Box>
          </Box>
        )}
      </PressableCard>
      <QtyBadge aria-hidden={qty === 0} visible={badgeVisible}>
        {qty > 0 ? qty : null}
      </QtyBadge>
    </Box>
  );
}
