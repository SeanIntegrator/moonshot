import type { GroupedKdsLine } from '@moonshot/domain';
import type { OrderType } from '@moonshot/types';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FoodRow } from './FoodRow.js';

/** Soft forest green — same as ticket READY header chrome. */
const FOOD_STRIP_READY = 'bg-[#2f4f3e] text-[#e8f5ee]';
const FOOD_STRIP_DEFAULT = 'bg-[#3a4555] text-[#a8b4c4]';

function FoodStrip({
  only,
  expanded,
  allFoodMade,
  onToggle,
}: {
  only: boolean;
  expanded: boolean;
  allFoodMade: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse food items' : 'Expand food items'}
      className={cn(
        'relative flex w-full cursor-pointer items-center justify-center px-4 py-1.5 outline-none [-webkit-tap-highlight-color:transparent]',
        allFoodMade ? FOOD_STRIP_READY : FOOD_STRIP_DEFAULT,
      )}
      onClick={onToggle}
    >
      <span className="text-base font-bold tracking-[0.12em] uppercase">
        {only ? 'FOOD ONLY' : 'FOOD'}
      </span>
      <ChevronDown
        aria-hidden
        className={cn(
          'absolute right-3 size-5 shrink-0 transition-transform duration-300 ease-in-out',
          expanded && 'rotate-180',
        )}
      />
    </button>
  );
}

type FoodSectionProps = {
  foods: GroupedKdsLine[];
  drinksEmpty: boolean;
  expanded: boolean;
  onToggle: () => void;
  madeIds: ReadonlySet<string>;
  onToggleMade: (sourceIds: readonly string[]) => void;
  orderType: OrderType;
  showFulfillmentIcon?: boolean;
};

/**
 * FOOD strip + collapsible rows. Collapse uses the same 300ms max-height
 * cadence as ticket dismiss so tickets below slide rather than jump.
 */
export function FoodSection({
  foods,
  drinksEmpty,
  expanded,
  onToggle,
  madeIds,
  onToggleMade,
  orderType,
  showFulfillmentIcon = false,
}: FoodSectionProps) {
  if (foods.length === 0) return null;

  const allFoodMade = foods.every((f) => f.sourceIds.every((id) => madeIds.has(id)));

  return (
    <>
      <FoodStrip
        only={drinksEmpty}
        expanded={expanded}
        allFoodMade={allFoodMade}
        onToggle={onToggle}
      />
      <div
        className={cn(
          'overflow-hidden transition-[max-height] duration-300 ease-in-out',
          expanded ? 'max-h-[2000px]' : 'max-h-0',
        )}
      >
        {foods.map(({ item, view, sourceIds, quantity }) => (
          <FoodRow
            key={sourceIds.join('|')}
            itemName={item.itemName}
            quantity={quantity}
            view={view}
            made={sourceIds.every((id) => madeIds.has(id))}
            onToggleMade={() => onToggleMade(sourceIds)}
            orderType={orderType}
            showFulfillmentIcon={showFulfillmentIcon}
          />
        ))}
      </div>
    </>
  );
}
