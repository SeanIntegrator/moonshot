import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LocalCafeIcon from '@mui/icons-material/LocalCafe';
import type { NormalisedOrder } from '@moonshot/types';
import { Box, Button, Chip, Divider, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatTime, modifierSummary } from '../lib/format.js';
import { getOrderStatusMeta } from '../lib/order-status.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { useMenu } from '../providers/MenuProvider.js';
import { MenuItemImage } from './MenuItemImage.js';

type Props = {
  order: NormalisedOrder;
};

export function CurrentOrderCard({ order }: Props) {
  const cafePath = useCafePath();
  const { menu } = useMenu();
  const statusMeta = getOrderStatusMeta(order.status);
  const chipLabel =
    order.status === 'pending' || order.status === 'confirmed'
      ? 'Order confirmed'
      : statusMeta.label;

  return (
    <Box
      component={RouterLink}
      to={cafePath(`/orders/${order.id}`)}
      sx={{
        display: 'block',
        textDecoration: 'none',
        color: 'text.primary',
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            Pickup
          </Typography>
          <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatTime(order.pickup.pickupTime)}
          </Typography>
        </Box>
        <Chip label={chipLabel} size="small" color={statusMeta.chipColor} />
      </Box>
      <Box sx={{ p: 2 }}>
        {order.items.slice(0, 3).map((li) => {
          // Order lines snapshot name/mods but not images — resolve from live menu.
          const menuItem = li.menuItemId
            ? menu?.items.find((i) => i.id === li.menuItemId)
            : undefined;
          return (
            <Box key={li.id} sx={{ display: 'flex', gap: 1.5, alignItems: 'center', mb: 1.25 }}>
              <MenuItemImage
                src={menuItem?.imageUrl}
                alt={li.itemName}
                width={56}
                height={56}
                borderRadius={1}
                loading="lazy"
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} color="text.primary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
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
          );
        })}
        <Divider sx={{ my: 1.25 }} />
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Typography variant="body2" color="primary" fontWeight={600}>
              View details
            </Typography>
            <ChevronRightIcon sx={{ fontSize: 18, color: 'primary.main' }} />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

type OrderNowProps = {
  onClick: () => void;
};

export function OrderNowButton({ onClick }: OrderNowProps) {
  return (
    <Button
      variant="contained"
      fullWidth
      onClick={onClick}
      startIcon={<LocalCafeIcon fontSize="small" />}
      endIcon={<ChevronRightIcon fontSize="small" />}
      sx={(theme) => ({
        mt: 2,
        py: 1.75,
        fontSize: '1.05rem',
        // Hero sits on cafe.heroBg — never use outlined/primary (dark-on-dark).
        bgcolor: theme.palette.cafe.heroText,
        color: theme.palette.cafe.heroBg,
        '&:hover': {
          bgcolor: theme.palette.cafe.heroText,
          filter: 'brightness(0.92)',
        },
      })}
    >
      Order now
    </Button>
  );
}
