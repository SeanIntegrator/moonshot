import type { OrderType } from '@moonshot/types';
import { ShoppingBag, Utensils } from 'lucide-react';
import { cn } from '@/lib/utils';

type FulfillmentIconProps = {
  orderType: OrderType;
  className?: string;
};

export function fulfillmentLabel(orderType: OrderType): string {
  return orderType === 'eat_in' ? 'Eat in' : 'Takeaway';
}

/** Single eat-in or takeaway glyph (Lucide). */
export function FulfillmentIcon({ orderType, className }: FulfillmentIconProps) {
  const Icon = orderType === 'eat_in' ? Utensils : ShoppingBag;
  return (
    <Icon
      className={cn('shrink-0', className)}
      aria-hidden
    />
  );
}

type FulfillmentIconGroupProps = {
  types: readonly OrderType[];
  className?: string;
  iconClassName?: string;
};

/** One or both cup icons — stable order: eat-in, then takeaway. */
export function FulfillmentIconGroup({
  types,
  className,
  iconClassName,
}: FulfillmentIconGroupProps) {
  const unique = [...new Set(types)].sort((a, b) => {
    if (a === b) return 0;
    return a === 'eat_in' ? -1 : 1;
  });

  if (unique.length === 0) return null;

  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1', className)} aria-hidden>
      {unique.map((type) => (
        <FulfillmentIcon key={type} orderType={type} className={iconClassName} />
      ))}
    </span>
  );
}
