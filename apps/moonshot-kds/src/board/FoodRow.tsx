import type { FlowLineView } from '@moonshot/domain';
import type { OrderType } from '@moonshot/types';
import { CheckSquare, Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FlowRowDensity } from './DrinkRow.js';
import { FulfillmentQtyCell } from './FulfillmentQtyCell.js';
import { formatAllergenLabel } from './formatAllergen.js';

type FoodRowProps = {
  itemName: string;
  quantity: number;
  view: FlowLineView;
  made: boolean;
  onToggleMade: () => void;
  /** `compact` for close-range chrome (e.g. recent orders); board stays glanceable. */
  density?: FlowRowDensity;
  /** Checkbox affordance for recall line selection; `made` is the inverse of selected. */
  showSelectControl?: boolean;
  /** Order-level fulfillment preview until per-line cups exist. */
  orderType?: OrderType;
};

export function FoodRow({
  itemName,
  quantity,
  view,
  made,
  onToggleMade,
  density = 'board',
  showSelectControl = false,
  orderType = 'takeaway',
}: FoodRowProps) {
  const compact = density === 'compact';
  const qtyMulti = quantity > 1;
  const py = compact ? 'py-1.5' : 'py-[calc(0.55rem+8px)]';

  return (
    <button
      type="button"
      data-flow-row="food"
      data-density={density}
      aria-pressed={showSelectControl ? !made : undefined}
      className={cn(
        'grid w-full cursor-pointer grid-cols-[minmax(10rem,auto)_minmax(0,1fr)] items-stretch gap-0 border-b border-border bg-transparent text-left text-card-foreground outline-none last:border-b-0 [-webkit-tap-highlight-color:transparent]',
        compact ? 'px-3' : 'px-4',
        made && 'opacity-45 [&_.flow-strike]:line-through',
      )}
      onClick={onToggleMade}
    >
      <div
        data-flow-col="shot"
        className={cn(
          'flex min-w-0 items-stretch whitespace-nowrap',
          compact ? 'gap-1.5' : 'gap-2.5',
          qtyMulti && 'bg-muted/40',
        )}
      >
        {showSelectControl ? (
          <span className="flex shrink-0 items-center text-primary" aria-hidden>
            {made ? (
              <Square className={compact ? 'size-4' : 'size-5'} />
            ) : (
              <CheckSquare className={compact ? 'size-4' : 'size-5'} />
            )}
          </span>
        ) : null}
        <FulfillmentQtyCell
          orderType={orderType}
          quantity={quantity}
          compact={compact}
          qtyMulti={qtyMulti}
          className={py}
        />
        <span
          className={cn('w-px shrink-0 self-stretch bg-border', qtyMulti && 'w-0.5 bg-foreground/50')}
          aria-hidden
        />
        <span
          className={cn(
            'flow-strike self-center font-semibold italic',
            compact ? 'text-sm' : 'text-2xl',
            py,
          )}
        >
          {itemName}
        </span>
      </div>
      <div
        className={cn(
          'flex min-w-0 flex-wrap items-center justify-end',
          compact ? 'gap-1 py-1.5' : 'gap-1.5 py-[calc(0.55rem+8px)]',
        )}
      >
        {view.allergens.length > 0 ? (
          <span className={cn('flow-strike', compact ? 'flow-allergen-sm' : 'flow-allergen')}>
            {`Allergy ${view.allergens.map(formatAllergenLabel).join(', ')}`}
          </span>
        ) : null}
        {view.notes?.trim() ? (
          <span
            className={cn(
              'flow-strike font-normal text-[#e8eef2]',
              compact ? 'text-xs' : 'text-[1.05rem]',
            )}
          >
            {view.notes.trim()}
          </span>
        ) : null}
      </div>
    </button>
  );
}
