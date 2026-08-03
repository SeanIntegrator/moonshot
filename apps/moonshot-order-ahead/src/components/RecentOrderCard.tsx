import type { NormalisedOrder } from '@moonshot/types';
import { Box, Button, Typography } from '@mui/material';
import { formatMoney, formatOrderDate, modifierSummary } from '../lib/format.js';
import { useMenu } from '../providers/MenuProvider.js';
import { MenuItemImage } from './MenuItemImage.js';
import { SurfaceCard } from './ui/SurfaceCard.js';

type Props = {
  order: NormalisedOrder;
  orderingAvailable: boolean;
  onReorder: (order: NormalisedOrder) => void;
};

export function RecentOrderCard({ order, orderingAvailable, onReorder }: Props) {
  const { menu } = useMenu();

  return (
    <SurfaceCard sx={{ p: 1.5, mb: 1.5 }}>
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
        Ordered on {formatOrderDate(order.createdAt)}
      </Typography>

      {order.items.map((li) => {
        const menuItem = li.menuItemId
          ? menu?.items.find((i) => i.id === li.menuItemId)
          : undefined;
        return (
          <Box key={li.id} sx={{ display: 'flex', gap: 1.5, py: 1.25, alignItems: 'center' }}>
            <MenuItemImage
              src={menuItem?.imageUrl}
              alt={li.itemName}
              width={56}
              height={56}
              borderRadius={1}
              loading="lazy"
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" fontWeight={600}>
                {li.quantity > 1 ? `${li.quantity}× ${li.itemName}` : li.itemName}
              </Typography>
              {li.modifiers.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {modifierSummary(li.modifiers)}
                </Typography>
              )}
            </Box>
            <Typography variant="body2" sx={{ fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
              {formatMoney(li.unitPriceMinor * li.quantity, order.currency)}
            </Typography>
          </Box>
        );
      })}

      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
        <Button
          variant="contained"
          color="primary"
          disabled={!orderingAvailable}
          onClick={() => onReorder(order)}
          sx={{ fontVariantNumeric: 'tabular-nums' }}
        >
          Reorder {formatMoney(order.totalMinor, order.currency)}
        </Button>
      </Box>
    </SurfaceCard>
  );
}
