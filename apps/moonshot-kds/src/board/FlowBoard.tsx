import type { KdsConfig, NormalisedOrder } from '@moonshot/types';
import { OrderCard } from './OrderCard.js';
import './board.css';

type FlowBoardProps = {
  orders: NormalisedOrder[];
  kdsConfig: KdsConfig;
  dismissingIds: ReadonlySet<string>;
  onComplete: (orderId: string) => void;
  onExited: (orderId: string) => void;
};

export function FlowBoard({
  orders,
  kdsConfig,
  dismissingIds,
  onComplete,
  onExited,
}: FlowBoardProps) {
  if (orders.length === 0) {
    return (
      <div className="flow-empty" role="status">
        Waiting for orders
      </div>
    );
  }

  return (
    <ul className="flow-board">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          kdsConfig={kdsConfig}
          dismissing={dismissingIds.has(order.id)}
          onComplete={onComplete}
          onExited={onExited}
        />
      ))}
    </ul>
  );
}
