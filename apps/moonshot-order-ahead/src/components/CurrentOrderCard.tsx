import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import type { NormalisedOrder } from '@moonshot/types';
import { Box, Chip, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatMoney, formatTime, modifierSummary } from '../lib/format.js';
import { useCafePath } from '../hooks/useCafePath.js';

const STATUS_LABEL: Record<string, string> = {
  pending: 'Confirmed',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  ready: 'Ready',
  completed: 'Done',
};

type Props = {
  order: NormalisedOrder;
  compact?: boolean;
};

export function CurrentOrderCard({ order, compact = false }: Props) {
  const cafePath = useCafePath();
  const statusLabel = STATUS_LABEL[order.status] ?? order.status;

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
        borderRadius: 1.5,
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
        <Chip label={statusLabel} size="small" color="primary" />
      </Box>
      <Box sx={{ p: 1.5 }}>
        {!compact &&
          order.items.slice(0, 3).map((li) => (
            <Box key={li.id} sx={{ display: 'flex', gap: 1.25, alignItems: 'center', mb: 1 }}>
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  flexShrink: 0,
                }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600}>
                  {li.itemName}
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
            <Typography variant="body2" fontWeight={600}>
              {formatTime(order.pickup.pickupTime)}
            </Typography>
            <Typography variant="body2" color="primary" fontWeight={600}>
              View details <ChevronRightIcon sx={{ fontSize: 16, verticalAlign: 'middle' }} />
            </Typography>
          </Box>
        </Box>
        {compact && (
          <Typography variant="body2" fontWeight={700} sx={{ mt: 0.5 }}>
            {formatMoney(order.totalMinor, order.currency)} · {order.items.length} item
            {order.items.length !== 1 ? 's' : ''}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

type OrderNowProps = {
  onClick: () => void;
};

export function OrderNowButton({ onClick }: OrderNowProps) {
  return (
    <Box
      component="button"
      onClick={onClick}
      sx={{
        mt: 2,
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1,
        py: 1.75,
        px: 2,
        border: 'none',
        borderRadius: 1.5,
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
