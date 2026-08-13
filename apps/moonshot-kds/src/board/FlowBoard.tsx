import type { KdsAdvanceStatusRequest, KdsConfig, NormalisedOrder } from '@moonshot/types';
import { OrderCard } from './OrderCard.js';

type FlowBoardProps = {
  orders: NormalisedOrder[];
  kdsConfig: KdsConfig;
  dismissingIds: ReadonlySet<string>;
  recallSelections: ReadonlyMap<string, ReadonlySet<string>>;
  onComplete: (orderId: string) => void;
  onExited: (orderId: string) => void;
  onSetStatus: (orderId: string, status: KdsAdvanceStatusRequest['status']) => void;
};

export function FlowBoard({
  orders,
  kdsConfig,
  dismissingIds,
  recallSelections,
  onComplete,
  onExited,
  onSetStatus,
}: FlowBoardProps) {
  if (orders.length === 0) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center rounded-xl bg-surface-sunken/50 text-4xl font-bold tracking-wide text-muted-foreground/70"
        role="status"
      >
        Waiting for orders
      </div>
    );
  }

  return (
    <div className="flex flex-col items-stretch">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          kdsConfig={kdsConfig}
          dismissing={dismissingIds.has(order.id)}
          initialMadeIds={recallSelections.get(order.id)}
          onComplete={onComplete}
          onExited={onExited}
          onSetStatus={onSetStatus}
        />
      ))}
    </div>
  );
}
