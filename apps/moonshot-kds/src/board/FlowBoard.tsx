import type { KdsConfig, NormalisedOrder } from '@moonshot/types';
import { OrderCard } from './OrderCard.js';
import './board.css';

type FlowBoardProps = {
  orders: NormalisedOrder[];
  kdsConfig: KdsConfig;
  busyId: string | null;
  onComplete: (orderId: string) => void;
};

export function FlowBoard({ orders, kdsConfig, busyId, onComplete }: FlowBoardProps) {
  if (orders.length === 0) {
    return <p className="kds-placeholder">No open orders. Waiting for tickets…</p>;
  }

  return (
    <ul className="flow-board">
      {orders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          kdsConfig={kdsConfig}
          busy={busyId === order.id}
          onComplete={onComplete}
        />
      ))}
    </ul>
  );
}
