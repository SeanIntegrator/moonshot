import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import type { NormalisedOrder } from '@moonshot/types';
import { Box, Chip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatTime, modifierSummary } from '../lib/format.js';
import { getOrderStatusMeta } from '../lib/order-status.js';
import { useCafePath } from '../hooks/useCafePath.js';

type Props = {
  order: NormalisedOrder;
};

export function CurrentOrderCard({ order }: Props) {
  const cafePath = useCafePath();
  const statusMeta = getOrderStatusMeta(order.status);

  return (
    <Box
      component={RouterLink}
      to={cafePath(`/orders/${order.id}`)}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'inherit',
        border: 1,
        borderColor: 'divider',
        borderRadius: (theme) => `${theme.shape.borderRadius}px`,
        overflow: 'hidden',
        bgcolor: 'background.paper',
        mt: 2,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ letterSpacing: 0.5 }}>
          Your order
        </Typography>
        <Chip label={statusMeta.label} size="small" color={statusMeta.chipColor} />
      </Box>
      <Box sx={{ p: 2 }}>
        {order.items.slice(0, 3).map((li) => (
          <Box key={li.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1.25 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: 1,
                bgcolor: 'action.hover',
                flexShrink: 0,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {li.itemName}
                {li.quantity > 1 && (
                  <Typography component="span" variant="caption" color="text.secondary">
                    x{li.quantity}
                  </Typography>
                )}
              </Typography>
              {li.modifiers.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {modifierSummary(li.modifiers)}
                </Typography>
              )}
            </Box>
          </Box>
        ))}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Pickup
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatTime(order.pickup.pickupTime)}
            </Typography>
            <Typography variant="body2" color="text.primary" fontWeight={600}>
              View details
            </Typography>
            <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

type OrderNowProps = {
  onClick: () => void;
  flush?: boolean;
};

export function OrderNowButton({ onClick, flush = false }: OrderNowProps) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        mt: flush ? 0 : 2,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: 1.75,
        px: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: (theme) => `${theme.shape.borderRadius}px`,
        bgcolor: 'background.paper',
        color: 'text.primary',
        fontWeight: 600,
        fontSize: '1.05rem',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <LocalCafeIcon fontSize="small" />
      Order now
      <ChevronRightIcon fontSize="small" />
    </Box>
  );
}
