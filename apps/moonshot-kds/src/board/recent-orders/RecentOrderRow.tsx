import type { KdsConfig, NormalisedOrder } from '@moonshot/types';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { FulfillmentIconGroup } from '../FulfillmentIcon.js';
import {
  orderFulfillmentTypes,
  showHeaderFulfillmentIcons,
} from '../fulfillment.js';
import {
  deriveTicketKind,
  ticketKindLabel,
} from '../useOrderTimer.js';
import { RecentOrderLines } from './RecentOrderLines.js';
import { formatRelativeCompleted, itemSummary } from './recent-order-format.js';

type RecentOrderRowProps = {
  order: NormalisedOrder;
  kdsConfig: KdsConfig;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  selectedLineIds: ReadonlySet<string>;
  onToggleLine: (lineId: string) => void;
  recalling: boolean;
  onRecall: () => void;
};

export function RecentOrderRow({
  order,
  kdsConfig,
  expanded,
  onExpandedChange,
  selectedLineIds,
  onToggleLine,
  recalling,
  onRecall,
}: RecentOrderRowProps) {
  const kind = deriveTicketKind(order);
  const headerShowIcons = showHeaderFulfillmentIcons(order);
  const fulfillmentTypes = orderFulfillmentTypes(order);
  const showCustomer =
    kind === 'pickup' &&
    kdsConfig.display.showCustomerNameInHeader &&
    Boolean(order.customerName?.trim());
  const completedAt = order.pickup.completedAt ?? order.updatedAt;
  const selectedCount = selectedLineIds.size;
  const totalCount = order.items.length;
  const canRecall = selectedCount > 0;
  const summary =
    totalCount > 0 && selectedCount < totalCount
      ? `${itemSummary(order, kdsConfig)} · ${selectedCount} of ${totalCount} to remake`
      : itemSummary(order, kdsConfig);

  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange}>
      <div className="rounded-xl border border-border bg-surface-raised ring-1 ring-foreground/5">
        <div className="flex items-stretch gap-2 p-2.5 sm:p-3">
          <CollapsibleTrigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1 text-left outline-none hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown
              className={cn(
                'size-5 shrink-0 text-muted-foreground transition-transform duration-200',
                expanded && 'rotate-180',
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant="info" className="font-semibold tracking-wide uppercase">
                  <span className="inline-flex items-center gap-1.5">
                    {headerShowIcons ? (
                      <FulfillmentIconGroup
                        types={fulfillmentTypes}
                        iconClassName="size-3.5"
                      />
                    ) : null}
                    {ticketKindLabel(kind)}
                  </span>
                </Badge>
                <Badge variant="success">Completed</Badge>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatRelativeCompleted(completedAt)}
                </span>
              </div>
              {showCustomer ? (
                <p className="truncate text-sm font-medium">{order.customerName.trim()}</p>
              ) : null}
              <p className="text-xs text-muted-foreground">{summary}</p>
            </div>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="default"
            size="lg"
            className="min-h-10 shrink-0 self-center"
            disabled={recalling || !canRecall}
            onClick={(e) => {
              e.stopPropagation();
              onRecall();
            }}
          >
            <RotateCcw className="size-4" />
            {recalling ? 'Recalling…' : 'Recall'}
          </Button>
        </div>
        <CollapsibleContent>
          <div className="border-t border-border px-2.5 pt-2 pb-2.5 sm:px-3">
            <RecentOrderLines
              order={order}
              kdsConfig={kdsConfig}
              selectedLineIds={selectedLineIds}
              onToggleLine={onToggleLine}
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
