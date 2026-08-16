import type { OrderType } from '@moonshot/types';
import { cn } from '@/lib/utils';

type FulfillmentQtyCellProps = {
  orderType: OrderType;
  quantity: number;
  /** Board shows icon+qty; compact (recall) hides icon to keep the shot column dense. */
  compact?: boolean;
  qtyMulti?: boolean;
  className?: string;
};

/**
 * Furniture-style table (top + two legs). Lucide's `Table` is a data-grid glyph.
 * Preview only — fulfillment is still order-level until per-line cups exist.
 */
function EatInTableIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M4 10h16" />
      <path d="M7 10v8" />
      <path d="M17 10v8" />
      <path d="M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
    </svg>
  );
}

/** Person walking — Lucide's Walking is absent from our lucide-react pin. */
function TakeawayWalkIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <circle cx="12" cy="4.5" r="1.75" />
      <path d="M10.5 8.5 8 13l-2.5 1.5" />
      <path d="M10.5 8.5 14 11l1 6.5" />
      <path d="M10.5 8.5 12 12l-3 7" />
      <path d="M14 11h3.5" />
    </svg>
  );
}

/**
 * Quantity column with eat-in / takeaway icon above the count.
 * Uses order-level `orderType` until line-level cup flags exist.
 */
export function FulfillmentQtyCell({
  orderType,
  quantity,
  compact = false,
  qtyMulti = false,
  className,
}: FulfillmentQtyCellProps) {
  const eatIn = orderType === 'eat_in';
  const label = eatIn ? 'Eat in' : 'Takeaway';
  const iconClass = compact ? 'size-3.5' : 'size-4';

  return (
    <span
      className={cn(
        'flex shrink-0 flex-col items-center justify-center self-center font-bold tabular-nums text-muted-foreground',
        compact ? 'w-6 gap-0' : 'w-8 gap-0.5',
        qtyMulti && 'text-card-foreground',
        className,
      )}
      aria-label={`${label}, quantity ${quantity}`}
    >
      {!compact ? (
        eatIn ? (
          <EatInTableIcon className={cn(iconClass, 'opacity-80')} />
        ) : (
          <TakeawayWalkIcon className={cn(iconClass, 'opacity-80')} />
        )
      ) : null}
      <span className={cn(compact ? 'text-sm' : 'text-[1.4rem]')}>{quantity}</span>
    </span>
  );
}
