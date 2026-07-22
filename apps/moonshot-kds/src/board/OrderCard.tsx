import { useState } from 'react';
import { deriveFlowLine, type KdsConfig, type NormalisedOrder } from '@moonshot/types';
import { DrinkRow } from './DrinkRow.js';
import { FoodRow } from './FoodRow.js';
import {
  deriveTicketKind,
  ticketKindLabel,
  useOrderTimer,
  type FlowTicketKind,
} from './useOrderTimer.js';

type OrderCardProps = {
  order: NormalisedOrder;
  kdsConfig: KdsConfig;
  busy: boolean;
  onComplete: (orderId: string) => void;
};

function FoodDivider({ only }: { only: boolean }) {
  return (
    <div className="flow-food-divider" role="separator">
      <span>{only ? 'FOOD ONLY' : 'FOOD'}</span>
    </div>
  );
}

export function OrderCard({ order, kdsConfig, busy, onComplete }: OrderCardProps) {
  const kind = deriveTicketKind(order);
  const timer = useOrderTimer(order, kdsConfig);
  const [madeIds, setMadeIds] = useState<Set<string>>(() => new Set());

  const lines = order.items.map((item) => ({
    item,
    view: deriveFlowLine(item, kdsConfig),
  }));
  const drinks = lines.filter((l) => !l.view.isFood);
  const foods = lines.filter((l) => l.view.isFood);
  const showCustomer =
    kind === 'pickup' &&
    kdsConfig.display.showCustomerNameInHeader &&
    Boolean(order.customerName?.trim());

  function toggleMade(lineId: string): void {
    setMadeIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }

  return (
    <li className={`flow-card flow-card-${kind}`}>
      <button
        type="button"
        className="flow-card-header"
        disabled={busy}
        onClick={() => onComplete(order.id)}
        title="Mark order done"
      >
        <div className="flow-card-header-left">
          <span className="flow-card-type">{ticketKindLabel(kind)}</span>
          {showCustomer ? (
            <span className="flow-card-customer">{order.customerName.trim()}</span>
          ) : null}
        </div>
        <span className={`flow-timer flow-timer-${timer.tone}`}>{timer.display}</span>
      </button>

      <div className="flow-card-body">
        {drinks.length === 0 && foods.length > 0 ? <FoodDivider only /> : null}

        {drinks.map(({ item, view }) => (
          <DrinkRow
            key={item.id}
            itemName={item.itemName}
            quantity={item.quantity}
            view={view}
            made={madeIds.has(item.id)}
            onToggleMade={() => toggleMade(item.id)}
          />
        ))}

        {foods.length > 0 && drinks.length > 0 ? <FoodDivider only={false} /> : null}

        {foods.map(({ item, view }) => (
          <FoodRow
            key={item.id}
            itemName={item.itemName}
            quantity={item.quantity}
            view={view}
            made={madeIds.has(item.id)}
            onToggleMade={() => toggleMade(item.id)}
          />
        ))}
      </div>
    </li>
  );
}

export type { FlowTicketKind };
