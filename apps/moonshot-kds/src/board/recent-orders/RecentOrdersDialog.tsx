import { useCallback, useEffect, useRef, useState } from 'react';
import type { KdsConfig, NormalisedOrder } from '@moonshot/types';
import { History, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
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
import { kdsFetchRecentOrders } from '../../lib/kds-api.js';
import { RecentOrderRow } from './RecentOrderRow.js';
import { allLineIds, mergeLineSelections } from './recent-order-format.js';

type RecentOrdersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  token: string;
  kdsConfig: KdsConfig;
  onRecall: (order: NormalisedOrder, opts: { lineIds: string[] }) => Promise<void>;
  onSessionExpired: () => void;
};

export function RecentOrdersDialog({
  open,
  onOpenChange,
  token,
  kdsConfig,
  onRecall,
  onSessionExpired,
}: RecentOrdersDialogProps) {
  const [orders, setOrders] = useState<NormalisedOrder[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [recallingId, setRecallingId] = useState<string | null>(null);
  const [selectedByOrder, setSelectedByOrder] = useState<Map<string, Set<string>>>(
    () => new Map(),
  );

  const tokenRef = useRef(token);
  tokenRef.current = token;
  const onExpiredRef = useRef(onSessionExpired);
  onExpiredRef.current = onSessionExpired;
  const wasOpenRef = useRef(false);
  const loadGenRef = useRef(0);
  const closingForRecallRef = useRef(false);
  const skipOpenFetchRef = useRef(false);

  const loadRecent = useCallback(async (opts: { initial: boolean }): Promise<void> => {
    const gen = ++loadGenRef.current;
    if (opts.initial) setInitialLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const data = await kdsFetchRecentOrders(tokenRef.current);
      if (gen !== loadGenRef.current) return;
      setOrders(data.orders);
      setSelectedByOrder((prev) => mergeLineSelections(prev, data.orders, opts.initial));
    } catch (err) {
      if (gen !== loadGenRef.current) return;
      if (err instanceof Error && err.message === 'SESSION_EXPIRED') {
        onExpiredRef.current();
        setError('Session expired — please sign in again.');
        return;
      }
      setError(err instanceof Error ? err.message : 'Failed to load recent orders');
    } finally {
      if (gen === loadGenRef.current) {
        if (opts.initial) setInitialLoading(false);
        else setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = open;

    if (!open) {
      if (wasOpen && !closingForRecallRef.current) {
        loadGenRef.current += 1;
        setExpandedId(null);
        setSelectedByOrder(new Map());
        setInitialLoading(false);
        setRefreshing(false);
      }
      return;
    }
    if (wasOpen) return;
    if (skipOpenFetchRef.current) {
      skipOpenFetchRef.current = false;
      return;
    }

    void loadRecent({ initial: true });
  }, [open, loadRecent]);

  function toggleLine(orderId: string, lineId: string): void {
    setSelectedByOrder((prev) => {
      const current = prev.get(orderId);
      if (!current) return prev;
      const nextSet = new Set(current);
      if (nextSet.has(lineId)) nextSet.delete(lineId);
      else nextSet.add(lineId);
      const next = new Map(prev);
      next.set(orderId, nextSet);
      return next;
    });
  }

  function handleRecall(order: NormalisedOrder): void {
    const selected = selectedByOrder.get(order.id) ?? allLineIds(order);
    const lineIds = [...selected];
    if (lineIds.length === 0) return;

    const restoreAt = orders.findIndex((o) => o.id === order.id);
    setRecallingId(order.id);
    setError(null);
    setOrders((prev) => prev.filter((o) => o.id !== order.id));
    closingForRecallRef.current = true;
    onOpenChange(false);

    void onRecall(order, { lineIds })
      .catch((err: unknown) => {
        setOrders((prev) => {
          if (prev.some((o) => o.id === order.id)) return prev;
          const next = [...prev];
          const index = restoreAt < 0 ? next.length : Math.min(restoreAt, next.length);
          next.splice(index, 0, order);
          return next;
        });
        setSelectedByOrder((prev) => {
          const next = new Map(prev);
          next.set(order.id, new Set(lineIds));
          return next;
        });
        setExpandedId(order.id);
        setError(
          err instanceof Error && err.message === 'SESSION_EXPIRED'
            ? 'Session expired — please sign in again.'
            : err instanceof Error
              ? err.message
              : 'Recall failed',
        );
        skipOpenFetchRef.current = true;
        onOpenChange(true);
      })
      .finally(() => {
        closingForRecallRef.current = false;
        setRecallingId(null);
      });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex h-[min(90vh,52rem)] w-[min(96vw,56rem)] max-w-4xl flex-col gap-0 overflow-hidden bg-popover p-0 sm:max-w-4xl"
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b border-border bg-surface-raised/50 px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="min-w-0 space-y-1.5">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <History className="size-5 text-info" aria-hidden />
                Recent orders
              </DialogTitle>
              <DialogDescription>
                Browse completed tickets and recall one back onto the board. Untick lines that
                are already made.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="min-h-10 shrink-0"
              disabled={refreshing || initialLoading}
              onClick={() => void loadRecent({ initial: false })}
            >
              <RefreshCw className={refreshing ? 'size-4 animate-spin' : 'size-4'} />
              Refresh
            </Button>
          </div>
        </DialogHeader>

        <div className="flex min-h-0 flex-1 flex-col bg-surface px-5 py-4">
          {error ? (
            <Alert variant="destructive" className="mb-3 shrink-0">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {initialLoading ? (
            <p className="py-12 text-center text-sm text-muted-foreground">Loading recent orders…</p>
          ) : orders.length === 0 ? (
            <p className="py-12 text-center text-sm text-muted-foreground">
              No completed orders to show yet.
            </p>
          ) : (
            <ScrollArea className="min-h-0 flex-1 rounded-lg bg-surface-sunken/40">
              <div className="flex flex-col gap-2.5 p-1 pr-3">
                {orders.map((order) => (
                  <RecentOrderRow
                    key={order.id}
                    order={order}
                    kdsConfig={kdsConfig}
                    expanded={expandedId === order.id}
                    onExpandedChange={(nextOpen) =>
                      setExpandedId(nextOpen ? order.id : null)
                    }
                    selectedLineIds={selectedByOrder.get(order.id) ?? allLineIds(order)}
                    onToggleLine={(lineId) => toggleLine(order.id, lineId)}
                    recalling={recallingId === order.id}
                    onRecall={() => handleRecall(order)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <DialogFooter className="shrink-0" showCloseButton={false}>
          <DialogClose render={<Button type="button" variant="outline" size="lg" className="min-h-10" />}>
            Close
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
