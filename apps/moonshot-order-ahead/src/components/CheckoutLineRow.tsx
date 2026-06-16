import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import type { NormalisedMenuItem } from '@moonshot/types';
import { Box, IconButton, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatMoney } from '../lib/format.js';
import { useCafePath } from '../hooks/useCafePath.js';
import type { CartLine } from '../providers/CartProvider.js';

type Props = {
  line: CartLine;
  item: NormalisedMenuItem | undefined;
  unitMinor: number | null;
  onQtyChange: (qty: number) => void;
  onRemove: () => void;
};

function modifierLabels(item: NormalisedMenuItem | undefined, line: CartLine): string {
  if (!item || line.modifiers.length === 0) return '';
  return line.modifiers
    .map((sel) => {
      const g = item.modifierGroups.find((x) => x.id === sel.groupId);
      const o = g?.options.find((x) => x.id === sel.optionId);
      return o?.name.toLowerCase() ?? '';
    })
    .filter(Boolean)
    .join(', ');
}

export function CheckoutLineRow({ line, item, unitMinor, onQtyChange, onRemove }: Props) {
  const cafePath = useCafePath();
  const mods = modifierLabels(item, line);
  const lineTotal = unitMinor != null ? unitMinor * line.quantity : null;

  return (
    <Box
      sx={{
        py: 1.5,
        borderBottom: 1,
        borderColor: 'divider',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1.5,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="body1" fontWeight={600}>
            {item?.name ?? line.menuItemId}
          </Typography>
          <Link component={RouterLink} to={cafePath(`/order/item/${line.menuItemId}`)} variant="caption" underline="hover">
            Edit
          </Link>
        </Box>
        {mods && (
          <Typography variant="caption" color="text.secondary">
            {mods}
          </Typography>
        )}
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexShrink: 0 }}>
        <IconButton size="small" onClick={() => onQtyChange(line.quantity - 1)} aria-label="Decrease">
          <RemoveIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ minWidth: 20, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
          {line.quantity}
        </Typography>
        <IconButton size="small" onClick={() => onQtyChange(line.quantity + 1)} aria-label="Increase">
          <AddIcon fontSize="small" />
        </IconButton>
        {lineTotal != null && (
          <Typography variant="body2" sx={{ minWidth: 48, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
            {formatMoney(lineTotal, item?.currency)}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
