import { useEffect, useRef, useState, type TransitionEvent } from 'react';
import type { KdsAdvanceStatusRequest, KdsConfig, NormalisedOrder } from '@moonshot/types';
import { deriveFlowLine } from '@moonshot/domain';
import { ChevronDown, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  onSetStatus: (orderId: string, status: KdsAdvanceStatusRequest['status']) => void;
};

const HEADER_BY_KIND: Record<FlowTicketKind, string> = {
  sit_in: 'bg-[#2a3344]',
  takeaway: 'bg-[#354a66]',
  pickup: 'bg-[#3d3554]',
};

/** Soft forest green when every line is crossed / order is ready for pickup. */
const HEADER_READY = 'bg-[#2f4f3e]';

const TIMER_BY_TONE: Record<TimerTone, string> = {
  green: 'border-transparent bg-[#4a6080] text-[#e8eef5]',
  amber: 'border-transparent bg-[#5c6a9a] text-[#eef0f8]',
  red: 'border-transparent bg-[#6b4a72] text-[#f5eef6]',
};

const TIMER_READY =
  'border-transparent bg-[#3d6b52] text-[#e8f5ee] tracking-wide';

/** Muted slate-blue strip — separates drinks from food; food rows stay on the dark card. */
function FoodStrip({
  only,
  expanded,
  onToggle,
}: {
  only: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse food items' : 'Expand food items'}
      className="relative flex w-full cursor-pointer items-center justify-center bg-[#3a4555] px-4 py-1.5 text-[#a8b4c4] outline-none [-webkit-tap-highlight-color:transparent]"
      onClick={onToggle}
    >
      <span className="text-base font-bold tracking-[0.12em] uppercase">
        {only ? 'FOOD ONLY' : 'FOOD'}
      </span>
      <ChevronDown
        aria-hidden
        className={cn(
          'absolute right-3 size-5 shrink-0 transition-transform duration-200',
          expanded && 'rotate-180',
        )}
      />
    </button>
  );
}

export function OrderCard({
  order,
  kdsConfig,
  dismissing,
  onComplete,
  onExited,
  onSetStatus,
}: OrderCardProps) {
  const kind = deriveTicketKind(order);
  const timer = useOrderTimer(order, kdsConfig);
  const lineIdsKey = order.items.map((i) => i.id).join('|');
  const [madeIds, setMadeIds] = useState<Set<string>>(() =>
    order.status === 'ready' ? new Set(order.items.map((i) => i.id)) : new Set(),
  );
  const [foodExpanded, setFoodExpanded] = useState(true);
  const bodyRef = useRef<HTMLDivElement>(null);
  // Prevents socket/poll refreshes from overwriting in-progress barista line toggles.
  const userEditedMadeRef = useRef(false);
  const prevOrderIdRef = useRef(order.id);

  const lines = order.items.map((item) => ({
    item,
    view: deriveFlowLine(item, kdsConfig),
  }));
  const drinks = lines.filter((l) => !l.view.isFood);
  const foods = lines.filter((l) => l.view.isFood);
  const lineIds = lines.map((l) => l.item.id);
  const allMade = lineIds.length > 0 && lineIds.every((id) => madeIds.has(id));
  // Ready chrome is line-driven so demote (un-cross) is instant, not waiting on API.
  const showReadyChrome = allMade;
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

  // Seed madeIds from server status when the card mounts or the order id changes,
  // and when a refresh arrives before the barista has edited lines locally.
  useEffect(() => {
    if (prevOrderIdRef.current !== order.id) {
      prevOrderIdRef.current = order.id;
      userEditedMadeRef.current = false;
    }
    if (userEditedMadeRef.current) return;

    const ids = lineIdsKey.length > 0 ? lineIdsKey.split('|') : [];
    if (order.status === 'ready' && ids.length > 0) {
      setMadeIds(new Set(ids));
    } else {
      setMadeIds(new Set());
    }
  }, [order.id, order.status, lineIdsKey]);

  useEffect(() => {
    if (lineIds.length === 0) return;
    if (order.status === 'completed' || order.status === 'cancelled') return;

    // Already in sync — avoid redundant POSTs after seeding madeIds from status.
    if (allMade && order.status === 'ready') return;
    if (!allMade && order.status !== 'ready') return;

    if (allMade) {
      onSetStatus(order.id, 'ready');
      return;
    }
    onSetStatus(order.id, 'confirmed');
  }, [allMade, lineIds.length, onSetStatus, order.id, order.status]);

  function toggleMade(lineId: string): void {
    userEditedMadeRef.current = true;
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
        'mb-8 max-h-[2000px] overflow-hidden transition-[max-height,opacity,margin,border-width] duration-300 ease-in-out',
        dismissing && 'pointer-events-none mb-0 max-h-0 border-0 opacity-0',
      )}
      onTransitionEnd={handleTransitionEnd}
    >
      <Card className="w-full gap-0 overflow-hidden rounded-[10px] bg-card py-0 shadow-[0_4px_24px_8px_rgba(0,0,0,0.38)] ring-1 ring-black/20">
        <div
          className={cn(
            'flex w-full items-center gap-2 px-4 py-3 text-[#e8eef2]',
            showReadyChrome ? HEADER_READY : HEADER_BY_KIND[kind],
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
                'h-auto shrink-0 rounded-full px-3.5 py-1 text-[1.15rem] font-bold leading-snug',
                showReadyChrome ? TIMER_READY : cn('tabular-nums', TIMER_BY_TONE[timer.tone]),
              )}
            >
              {showReadyChrome ? 'READY' : timer.display}
            </Badge>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11 shrink-0 rounded-[6px] border-2 border-transparent bg-white/3 text-[#e8eef2] hover:bg-white/15 hover:text-[#e8eef2] [&_svg]:size-5"
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
          {drinks.map(({ item, view }, i) => (
            <DrinkRow
              key={item.id}
              itemName={item.itemName}
              quantity={item.quantity}
              view={view}
              made={madeIds.has(item.id)}
              onToggleMade={() => toggleMade(item.id)}
              hideBottomBorder={foods.length > 0 && i === drinks.length - 1}
            />
          ))}

          {foods.length > 0 ? (
            <>
              <FoodStrip
                only={drinks.length === 0}
                expanded={foodExpanded}
                onToggle={() => setFoodExpanded((prev) => !prev)}
              />
              {foodExpanded
                ? foods.map(({ item, view }) => (
                    <FoodRow
                      key={item.id}
                      itemName={item.itemName}
                      quantity={item.quantity}
                      view={view}
                      made={madeIds.has(item.id)}
                      onToggleMade={() => toggleMade(item.id)}
                    />
                  ))
                : null}
            </>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

export type { FlowTicketKind };
