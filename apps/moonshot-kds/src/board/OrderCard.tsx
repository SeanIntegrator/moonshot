import { useRef, useState, type TransitionEvent } from 'react';
import { deriveFlowLine, type KdsConfig, type NormalisedOrder } from '@moonshot/types';
import { MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { DrinkRow } from './DrinkRow.js';
import { FoodRow } from './FoodRow.js';
import { useEqualizeShotColumnWidth } from './useEqualizeShotColumnWidth.js';
import {
  deriveTicketKind,
  ticketKindLabel,
  useOrderTimer,
  type FlowTicketKind,
  type TimerTone,
} from './useOrderTimer.js';

type OrderCardProps = {
  order: NormalisedOrder;
  kdsConfig: KdsConfig;
  dismissing: boolean;
  onComplete: (orderId: string) => void;
  onExited: (orderId: string) => void;
};

const HEADER_BY_KIND: Record<FlowTicketKind, string> = {
  sit_in: 'bg-[#2a3344]',
  takeaway: 'bg-[#354a66]',
  pickup: 'bg-[#3d3554]',
};

const TIMER_BY_TONE: Record<TimerTone, string> = {
  green: 'border-transparent bg-[#4a6080] text-[#e8eef5]',
  amber: 'border-transparent bg-[#5c6a9a] text-[#eef0f8]',
  red: 'border-transparent bg-[#6b4a72] text-[#f5eef6]',
};

function FoodDivider({ only }: { only: boolean }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2" role="separator">
      <Separator className="w-auto flex-1" />
      <span className="shrink-0 text-xs font-bold tracking-[0.12em] text-muted-foreground uppercase">
        {only ? 'FOOD ONLY' : 'FOOD'}
      </span>
      <Separator className="w-auto flex-1" />
    </div>
  );
}

export function OrderCard({
  order,
  kdsConfig,
  dismissing,
  onComplete,
  onExited,
}: OrderCardProps) {
  const kind = deriveTicketKind(order);
  const timer = useOrderTimer(order, kdsConfig);
  const [madeIds, setMadeIds] = useState<Set<string>>(() => new Set());
  const bodyRef = useRef<HTMLDivElement>(null);

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

  // Content that affects natural shot-column width (remeasure when it changes).
  const shotContentKey = drinks
    .map(
      ({ item, view }) =>
        `${item.id}:${item.quantity}:${item.itemName}:${view.shotLabel ?? ''}:${view.sizeLabel ?? ''}`,
    )
    .join('|');

  useEqualizeShotColumnWidth(bodyRef, shotContentKey);

  function toggleMade(lineId: string): void {
    setMadeIds((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }

  function handleTransitionEnd(e: TransitionEvent<HTMLDivElement>): void {
    if (e.target !== e.currentTarget) return;
    if (e.propertyName !== 'max-height') return;
    if (!dismissing) return;
    onExited(order.id);
  }

  return (
    <div
      className={cn(
        'mb-3 max-h-[2000px] overflow-hidden transition-[max-height,opacity,margin,border-width] duration-300 ease-in-out',
        dismissing && 'pointer-events-none mb-0 max-h-0 border-0 opacity-0',
      )}
      onTransitionEnd={handleTransitionEnd}
    >
      <Card className="w-full gap-0 overflow-hidden rounded-[10px] bg-[#0e1116] py-0 ring-[#1c2229]">
        <div
          className={cn(
            'flex w-full items-center gap-2 px-4 py-3 text-[#e8eef2]',
            HEADER_BY_KIND[kind],
          )}
        >
          <button
            type="button"
            className="flex min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 border-0 bg-transparent p-0 text-left text-inherit outline-none [-webkit-tap-highlight-color:transparent]"
            onClick={() => onComplete(order.id)}
            title="Mark order done"
          >
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[1.35rem] font-bold tracking-wider uppercase">
                {ticketKindLabel(kind)}
              </span>
              {showCustomer ? (
                <span className="truncate text-lg opacity-90">{order.customerName.trim()}</span>
              ) : null}
            </div>
            <Badge
              className={cn(
                'h-auto shrink-0 rounded-full px-3.5 py-1 text-[1.3rem] font-bold tabular-nums leading-snug',
                TIMER_BY_TONE[timer.tone],
              )}
            >
              {timer.display}
            </Badge>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 text-[#e8eef2] hover:bg-white/10 hover:text-[#e8eef2]"
                  aria-label="Order actions"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              }
            >
              <MoreVertical />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-40">
              <DropdownMenuItem disabled>Hold</DropdownMenuItem>
              <DropdownMenuItem disabled>Merge with…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CardContent className="flex flex-col p-0" ref={bodyRef}>
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
        </CardContent>
      </Card>
    </div>
  );
}

export type { FlowTicketKind };
