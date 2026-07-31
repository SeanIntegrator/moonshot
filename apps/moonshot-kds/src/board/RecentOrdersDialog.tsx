import { useEffect, useState } from 'react';
import {
  deriveFlowLine,
  type KdsConfig,
  type NormalisedOrder,
} from '@moonshot/types';
import { ChevronDown, History, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { kdsFetchRecentOrders } from '../lib/kds-api.js';
import { DrinkRow } from './DrinkRow.js';
import { FoodRow } from './FoodRow.js';
import {
  deriveTicketKind,
  ticketKindLabel,
} from './useOrderTimer.js';

type RecentOrdersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  kdsConfig: KdsConfig;
  onRecall: (orderId: string) => Promise<void>;
  onSessionExpired: () => void;
};

function formatRelativeCompleted(iso: string | null | undefined): string {
  if (!iso) return 'Completed';
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return 'Completed';
  const deltaSec = Math.round((Date.now() - ms) / 1000);
  if (deltaSec < 60) return 'Just now';
  if (deltaSec < 3600) return `${Math.floor(deltaSec / 60)}m ago`;
  if (deltaSec < 86_400) return `${Math.floor(deltaSec / 3600)}h ago`;
  return `${Math.floor(deltaSec / 86_400)}d ago`;
}

function itemSummary(order: NormalisedOrder, kdsConfig: KdsConfig): string {
  let drinks = 0;
  let foods = 0;
  for (const item of order.items) {
    const view = deriveFlowLine(item, kdsConfig);
    if (view.isFood) foods += item.quantity;
    else drinks += item.quantity;
  }
  const parts: string[] = [];
  if (drinks > 0) parts.push(`${drinks} drink${drinks === 1 ? '' : 's'}`);
  if (foods > 0) parts.push(`${foods} food`);
  return parts.length > 0 ? parts.join(' · ') : 'No items';
}

function RecentOrderLines({
  order,
  kdsConfig,
}: {
  order: NormalisedOrder;
  kdsConfig: KdsConfig;
}) {
  const lines = order.items.map((item) => ({
    item,
    view: deriveFlowLine(item, kdsConfig),
  }));
  const drinks = lines.filter((l) => !l.view.isFood);
  const foods = lines.filter((l) => l.view.isFood);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {drinks.map(({ item, view }, i) => (
        <DrinkRow
          key={item.id}
          itemName={item.itemName}
          quantity={item.quantity}
          view={view}
          made={false}
          onToggleMade={() => undefined}
          hideBottomBorder={foods.length > 0 && i === drinks.length - 1}
        />
      ))}
      {foods.length > 0 ? (
        <>
          <div className="bg-[#3a4555] px-4 py-1.5 text-center text-xs font-bold tracking-[0.12em] text-[#a8b4c4] uppercase">
            Food
          </div>
          {foods.map(({ item, view }) => (
            <FoodRow
              key={item.id}
              itemName={item.itemName}
              quantity={item.quantity}
              view={view}
              made={false}
              onToggleMade={() => undefined}
            />
          ))}
        </>
      ) : null}
      {order.notes?.trim() ? (
        <p className="border-t border-border px-4 py-2 text-sm text-muted-foreground">
          Notes: {order.notes.trim()}
        </p>
      ) : null}
    </div>
  );
}

function RecentOrderRow({
  order,
  kdsConfig,
  expanded,
  onExpandedChange,
  recalling,
  onRecall,
}: {
  order: NormalisedOrder;
  kdsConfig: KdsConfig;
  expanded: boolean;
  onExpandedChange: (open: boolean) => void;
  recalling: boolean;
  onRecall: () => void;
}) {
  const kind = deriveTicketKind(order);
  const showCustomer =
    kind === 'pickup' &&
    kdsConfig.display.showCustomerNameInHeader &&
    Boolean(order.customerName?.trim());
  const completedAt = order.pickup.completedAt ?? order.updatedAt;

  return (
    <Collapsible open={expanded} onOpenChange={onExpandedChange}>
      <div className="rounded-xl border border-border bg-card/60">
        <div className="flex items-stretch gap-2 p-3">
          <CollapsibleTrigger className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg text-left outline-none hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown
              className={cn(
                'size-5 shrink-0 text-muted-foreground transition-transform duration-200',
                expanded && 'rotate-180',
              )}
              aria-hidden
            />
            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="font-semibold tracking-wide uppercase">
                  {ticketKindLabel(kind)}
                </Badge>
                <Badge variant="outline">Completed</Badge>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {formatRelativeCompleted(completedAt)}
                </span>
              </div>
              {showCustomer ? (
                <p className="truncate text-base font-medium">{order.customerName.trim()}</p>
              ) : null}
              <p className="text-sm text-muted-foreground">{itemSummary(order, kdsConfig)}</p>
            </div>
          </CollapsibleTrigger>
          <Button
            type="button"
            variant="default"
            size="sm"
            className="shrink-0 self-center"
            disabled={recalling}
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
          <div className="pointer-events-none border-t border-border px-3 pt-2 pb-3">
            <RecentOrderLines order={order} kdsConfig={kdsConfig} />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

export function RecentOrdersDialog({
  open,
  onOpenChange,
  token,
  kdsConfig,
  onRecall,
  onSessionExpired,
}: RecentOrdersDialogProps) {
  const [orders, setOrders] = useState<NormalisedOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recallingId, setRecallingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setExpandedId(null);

    void kdsFetchRecentOrders(token)
      .then((data) => {
        if (cancelled) return;
        setOrders(data.orders);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
          onSessionExpired();
          setError('Session expired — please sign in again.');
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load recent orders');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, token, onSessionExpired]);

  async function handleRecall(orderId: string): Promise<void> {
    setRecallingId(orderId);
    setError(null);
    try {
      await onRecall(orderId);
      onOpenChange(false);
    } catch {
      // Error surfaced via useKdsOrders / local catch already set above if needed
    } finally {
      setRecallingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(90vh,52rem)] w-[min(96vw,56rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 pt-5 pb-4">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <History className="size-5" aria-hidden />
            Recent orders
          </DialogTitle>
          <DialogDescription>
            Browse completed tickets and recall one back onto the board.
          </DialogDescription>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col px-5 py-4">
          {error ? (
            <Alert variant="destructive" className="mb-3 shrink-0">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {loading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading recent orders…</p>
          ) : orders.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No completed orders to show yet.
            </p>
          ) : (
            <ScrollArea className="min-h-0 flex-1">
              <div className="flex flex-col gap-3 pr-3">
                {orders.map((order) => (
                  <RecentOrderRow
                    key={order.id}
                    order={order}
                    kdsConfig={kdsConfig}
                    expanded={expandedId === order.id}
                    onExpandedChange={(open) =>
                      setExpandedId(open ? order.id : null)
                    }
                    recalling={recallingId === order.id}
                    onRecall={() => void handleRecall(order.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="shrink-0" showCloseButton={false}>
          <DialogClose render={<Button type="button" variant="outline" />}>
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}