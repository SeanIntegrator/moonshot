import { Box, Typography } from '@mui/material';
import { CheckoutLineRow } from './CheckoutLineRow.js';
import type { PricedCartLine } from '../hooks/useCheckoutPricing.js';
import type { CartLine } from '../providers/CartProvider.js';
import { formatMoney } from '../lib/format.js';
import { SurfaceCard } from './ui/SurfaceCard.js';

export function CheckoutOrderSummary(params: {
  pricedLines: PricedCartLine[];
  itemCount: number;
  discountMinor: number;
  totalMinor: number;
  onQtyChange: (line: CartLine, qty: number) => void;
}) {
  const { pricedLines, itemCount, discountMinor, totalMinor, onQtyChange } = params;

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700}>
          Your order
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {itemCount} items
        </Typography>
      </Box>

      <SurfaceCard
        sx={{
          overflow: 'hidden',
          minHeight: pricedLines.length > 0 ? undefined : 120,
        }}
      >
        {pricedLines.map(({ line, item, unit }, index) => (
          <CheckoutLineRow
            key={line.key}
            line={line}
            item={item}
            unitMinor={unit}
            isLast={index === pricedLines.length - 1 && discountMinor === 0}
            onQtyChange={(qty) => onQtyChange(line, qty)}
          />
        ))}
        {discountMinor > 0 && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              px: 1.5,
              py: 1,
              color: 'success.main',
              borderTop: pricedLines.length > 0 ? 1 : 0,
              borderColor: 'divider',
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              Loyalty (−1 free)
            </Typography>
            <Typography variant="body2" fontWeight={600} sx={{ fontVariantNumeric: 'tabular-nums' }}>
              −{formatMoney(discountMinor)}
            </Typography>
          </Box>
        )}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            px: 1.5,
            py: 1.25,
            borderTop: pricedLines.length > 0 || discountMinor > 0 ? 1 : 0,
            borderColor: 'divider',
          }}
        >
          <Typography variant="body1" fontWeight={700}>
            Total
          </Typography>
          <Typography variant="body1" fontWeight={700} sx={{ fontVariantNumeric: 'tabular-nums' }}>
            {formatMoney(totalMinor)}
          </Typography>
        </Box>
      </SurfaceCard>
    </>
  );
}
