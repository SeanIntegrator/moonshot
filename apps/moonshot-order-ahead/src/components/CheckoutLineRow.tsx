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
  isLast?: boolean;
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

export function CheckoutLineRow({ line, item, unitMinor, onQtyChange, isLast = false }: Props) {
  const cafePath = useCafePath();
  const mods = modifierLabels(item, line);
  const lineTotal = unitMinor != null ? unitMinor * line.quantity : null;

  return (
    <Box
      sx={{
        borderBottom: isLast ? 0 : 1,
        borderColor: 'divider',
      }}
    >
      <Box
        sx={{
          px: 1.5,
          py: 1.25,
          display: 'flex',
          alignItems: 'flex-start',
          gap: 1,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="body2" fontWeight={700}>
              {item?.name ?? line.menuItemId}
            </Typography>
            <Link
              component={RouterLink}
              to={cafePath(`/order/item/${line.menuItemId}`)}
              variant="caption"
              underline="hover"
              color="primary"
              sx={{ fontWeight: 600 }}
            >
              Edit
            </Link>
          </Box>
          {mods && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
              {mods}
            </Typography>
          )}
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
          {lineTotal != null && (
            <Typography
              variant="body2"
              fontWeight={700}
              sx={{ minWidth: 44, textAlign: 'right', fontVariantNumeric: 'tabular-nums', ml: 0.25 }}
            >
              {formatMoney(lineTotal, item?.currency)}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}
