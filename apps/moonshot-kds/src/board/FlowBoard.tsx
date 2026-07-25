import type { KdsAdvanceStatusRequest, KdsConfig, NormalisedOrder } from '@moonshot/types';
import { OrderCard } from './OrderCard.js';

type FlowBoardProps = {
  orders: NormalisedOrder[];
  kdsConfig: KdsConfig;
  dismissingIds: ReadonlySet<string>;
  onComplete: (orderId: string) => void;
  onExited: (orderId: string) => void;
  onSetStatus: (orderId: string, status: KdsAdvanceStatusRequest['status']) => void;
};

export function FlowBoard({
  orders,
  kdsConfig,
  dismissingIds,
  onComplete,
  onExited,
  onSetStatus,
}: FlowBoardProps) {
  if (orders.length === 0) {
    return (
      <div
        className="flex min-h-[60vh] items-center justify-center text-4xl font-bold tracking-wide text-muted-foreground opacity-60"
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
          onComplete={onComplete}
          onExited={onExited}
          onSetStatus={onSetStatus}
        />
      ))}
    </div>
  );
}
