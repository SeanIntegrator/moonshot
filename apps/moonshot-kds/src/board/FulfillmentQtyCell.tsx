import type { OrderType } from '@moonshot/types';
import { cn } from '@/lib/utils';
import { FulfillmentIcon, fulfillmentLabel } from './FulfillmentIcon.js';

type FulfillmentQtyCellProps = {
  orderType: OrderType;
  quantity: number;
  /** Show cup icon beside qty on mixed tickets only; compact recall never shows icons. */
  showIcon?: boolean;
  compact?: boolean;
  qtyMulti?: boolean;
  className?: string;
};

/**
 * Quantity column. Homogeneous tickets show the count only; mixed tickets
 * (future per-line cups) show a Lucide icon beside the number.
 */
export function FulfillmentQtyCell({
  orderType,
  quantity,
  showIcon = false,
  compact = false,
  qtyMulti = false,
  className,
}: FulfillmentQtyCellProps) {
  const label = fulfillmentLabel(orderType);
  const iconVisible = showIcon && !compact;

  return (
    <span
      className={cn(
        'flex shrink-0 items-center justify-center self-center font-bold tabular-nums text-muted-foreground',
        iconVisible ? 'gap-1.5' : 'flex-col',
        compact ? 'w-6' : iconVisible ? 'min-w-[2.5rem]' : 'w-8',
        qtyMulti && 'text-card-foreground',
        className,
      )}
      aria-label={`${label}, quantity ${quantity}`}
    >
      {iconVisible ? (
        <FulfillmentIcon orderType={orderType} className="size-5 opacity-90" />
      ) : null}
      <span className={cn(compact ? 'text-sm' : 'text-[1.4rem]')}>{quantity}</span>
    </span>
  );
}
