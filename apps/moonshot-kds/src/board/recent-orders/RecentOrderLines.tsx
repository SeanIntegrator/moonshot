import type { KdsConfig, NormalisedOrder } from '@moonshot/types';
import { deriveFlowLine } from '@moonshot/domain';
import { DrinkRow } from '../DrinkRow.js';
import { FoodRow } from '../FoodRow.js';

type RecentOrderLinesProps = {
  order: NormalisedOrder;
  kdsConfig: KdsConfig;
  selectedLineIds: ReadonlySet<string>;
  onToggleLine: (lineId: string) => void;
};

export function RecentOrderLines({
  order,
  kdsConfig,
  selectedLineIds,
  onToggleLine,
}: RecentOrderLinesProps) {
  const lines = order.items.map((item) => ({
    item,
    view: deriveFlowLine(item, kdsConfig),
  }));
  const drinks = lines.filter((l) => !l.view.isFood);
  const foods = lines.filter((l) => l.view.isFood);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-sunken">
      {drinks.map(({ item, view }, i) => (
        <DrinkRow
          key={item.id}
          itemName={item.itemName}
          quantity={item.quantity}
          view={view}
          made={!selectedLineIds.has(item.id)}
          onToggleMade={() => onToggleLine(item.id)}
          hideBottomBorder={foods.length > 0 && i === drinks.length - 1}
          density="compact"
          showSelectControl
        />
      ))}
      {foods.length > 0 ? (
        <>
          <div className="bg-muted px-3 py-1 text-center text-[0.65rem] font-bold tracking-[0.12em] text-muted-foreground uppercase">
            Food
          </div>
          {foods.map(({ item, view }) => (
            <FoodRow
              key={item.id}
              itemName={item.itemName}
              quantity={item.quantity}
              view={view}
              made={!selectedLineIds.has(item.id)}
              onToggleMade={() => onToggleLine(item.id)}
              density="compact"
              showSelectControl
            />
          ))}
        </>
      ) : null}
      {order.notes?.trim() ? (
        <p className="border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
          Notes: {order.notes.trim()}
        </p>
      ) : null}
    </div>
  );
}
