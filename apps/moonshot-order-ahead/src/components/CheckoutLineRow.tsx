import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import type { NormalisedMenuItem } from '@moonshot/types';
import { Box, IconButton, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { formatPriceTag } from '../lib/format.js';
import { sizeById } from '../lib/menu-price-utils.js';
import { useCafePath } from '../hooks/useCafePath.js';
import type { CartLine } from '../providers/CartProvider.js';

type Props = {
  line: CartLine;
  item: NormalisedMenuItem | undefined;
  unitMinor: number | null;
  onQtyChange: (qty: number) => void;
  isLast?: boolean;
};

/** Size + modifiers as title-case labels for the checkout line subtitle. */
function lineDetailLabels(item: NormalisedMenuItem | undefined, line: CartLine): string {
  if (!item) return '';
  const parts: string[] = [];
  const size = sizeById(item.sizes ?? [], line.sizeId);
  if (size) parts.push(size.name);
  if (line.modifiers.length > 0) {
    for (const sel of line.modifiers) {
      const g = item.modifierGroups.find((x) => x.id === sel.groupId);
      const o = g?.options.find((x) => x.id === sel.optionId);
      if (o?.name) parts.push(o.name);
    }
  }
  return parts.join(' · ');
}

export function CheckoutLineRow({ line, item, unitMinor, onQtyChange, isLast = false }: Props) {
  const cafePath = useCafePath();
  const navigate = useNavigate();
  const mods = lineDetailLabels(item, line);
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
      {/* Row 1 — name + quantity + price */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2" fontWeight={700} sx={{ flex: 1, minWidth: 0 }}>
          {item?.name ?? line.menuItemId}
        </Typography>
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
          {lineTotalLabel ? (
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ minWidth: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums', ml: 0.25 }}
            >
              {lineTotalLabel}
            </Typography>
          ) : null}
        </Box>
      </Box>

      {/* Row 2 — customisation summary + edit */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minHeight: 28 }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}
        >
          {mods || 'No extras'}
        </Typography>
        <IconButton
          size="small"
          aria-label={`Edit ${item?.name ?? 'item'}`}
          onClick={() => navigate(cafePath(`/order/item/${line.menuItemId}`))}
          sx={{
            width: 28,
            height: 28,
            color: 'text.secondary',
            '&:hover': { color: 'primary.main', bgcolor: 'action.hover' },
          }}
        >
          <EditOutlinedIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>
    </Box>
  );
}
