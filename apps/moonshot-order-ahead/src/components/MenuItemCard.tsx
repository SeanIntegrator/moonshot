import AddIcon from '@mui/icons-material/Add';
import type { NormalisedMenuItem } from '@moonshot/types';
import { Box, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatMoney } from '../lib/format.js';
import { useCafePath } from '../hooks/useCafePath.js';

type Props = {
  item: NormalisedMenuItem;
  qty?: number;
  onQuickAdd: () => void;
};

export function MenuItemCard({ item, qty = 0, onQuickAdd }: Props) {
  const cafePath = useCafePath();

  return (
    <Box sx={{ position: 'relative' }}>
      {qty > 0 && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            zIndex: 1,
            minWidth: 22,
            height: 22,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {qty}
        </Box>
      )}
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
        component="button"
        onClick={(e) => {
          e.preventDefault();
          onQuickAdd();
        }}
        aria-label={`Add ${item.name}`}
        sx={{
          position: 'absolute',
          bottom: 52,
          right: 8,
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: 'none',
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        <AddIcon sx={{ fontSize: 18 }} />
      </Box>
    </Box>
  );
}
