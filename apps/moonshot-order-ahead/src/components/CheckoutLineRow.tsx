import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { NormalisedMenuItem } from '@moonshot/types';
import { Box, IconButton, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { formatPriceTag } from '../lib/format.js';
import { nonStandardCartLineLabels } from '../lib/modifier-display.js';
import { useCafePath } from '../hooks/useCafePath.js';
import type { CartLine } from '../providers/CartProvider.js';

type Props = {
  line: CartLine;
  item: NormalisedMenuItem | undefined;
  unitMinor: number | null;
  onQtyChange: (qty: number) => void;
  isLast?: boolean;
};

export function CheckoutLineRow({ line, item, unitMinor, onQtyChange, isLast = false }: Props) {
  const cafePath = useCafePath();
  const navigate = useNavigate();
  const mods = nonStandardCartLineLabels(item, line).join(' · ');
  const lineTotal = unitMinor != null ? unitMinor * line.quantity : null;
  const lineTotalLabel = lineTotal != null ? formatPriceTag(lineTotal, item?.currency) : null;

  return (
    <Box
      sx={{
        borderBottom: isLast ? 0 : 1,
        borderColor: 'divider',
        px: 1.5,
        py: 1.25,
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
      }}
    >
      {/* Row 1 — name + edit + quantity */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25, flex: 1, minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700} sx={{ minWidth: 0 }}>
            {item?.name ?? line.menuItemId}
          </Typography>
          <IconButton
            size="small"
            aria-label={`Edit ${item?.name ?? 'item'}`}
            onClick={() => navigate(cafePath(`/order/item/${line.menuItemId}`))}
            sx={{
              width: 28,
              height: 28,
              flexShrink: 0,
              color: 'text.secondary',
              '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            <EditOutlinedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flexShrink: 0 }}>
          <IconButton
            size="small"
            onClick={() => onQtyChange(line.quantity - 1)}
            aria-label="Decrease"
            sx={{
              width: 28,
              height: 28,
              bgcolor: 'action.hover',
              color: 'text.secondary',
              '&:hover': { bgcolor: 'action.selected' },
            }}
          >
            <RemoveIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ minWidth: 16, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
          >
            {line.quantity}
          </Typography>
          <IconButton
            size="small"
            onClick={() => onQtyChange(line.quantity + 1)}
            aria-label="Increase"
            sx={{
              width: 28,
              height: 28,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': { bgcolor: 'primary.dark' },
            }}
          >
            <AddIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Box>
      </Box>

      {/* Row 2 — customisation summary + price */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 20 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}
        >
          {mods || 'No extras'}
        </Typography>
        {lineTotalLabel ? (
          <Typography
            variant="body2"
            fontWeight={700}
            sx={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}
          >
            {lineTotalLabel}
          </Typography>
        ) : null}
      </Box>
    </Box>
  );
}
