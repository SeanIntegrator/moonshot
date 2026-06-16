import type { NormalisedMenuItem } from '@moonshot/types';
import { Box, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatMoney } from '../lib/format.js';
import { useCafePath } from '../hooks/useCafePath.js';

type Props = {
  item: NormalisedMenuItem;
  qty?: number;
};

export function MenuItemCard({ item, qty = 0 }: Props) {
  const cafePath = useCafePath();

  return (
    <Box sx={{ position: 'relative' }}>
      <Box
        component={RouterLink}
        to={cafePath(`/order/item/${item.id}`)}
        sx={{
          display: 'block',
          textDecoration: 'none',
          color: 'inherit',
          border: 1,
          borderColor: 'divider',
          borderRadius: 1.25,
          overflow: 'hidden',
          bgcolor: 'background.paper',
        }}
      >
        <Box
          sx={{
            aspectRatio: '1',
            bgcolor: 'action.hover',
            backgroundImage: item.imageUrl ? `url(${item.imageUrl})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <Box sx={{ p: 1.25, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 0.5 }}>
          <Typography variant="body2" fontWeight={600} sx={{ minWidth: 0 }}>
            {item.name}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
            {formatMoney(item.priceMinor, item.currency)}
          </Typography>
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
          visibility: qty > 0 ? 'visible' : 'hidden',
          pointerEvents: 'none',
        }}
      >
        {qty > 0 ? qty : null}
      </Box>
    </Box>
  );
}
