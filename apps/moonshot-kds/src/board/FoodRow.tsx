import type { FlowLineView } from '@moonshot/domain';
import { cn } from '@/lib/utils';
import type { FlowRowDensity } from './DrinkRow.js';
import { formatAllergenLabel } from './formatAllergen.js';

type FoodRowProps = {
  itemName: string;
  quantity: number;
  view: FlowLineView;
  made: boolean;
  onToggleMade: () => void;
  /** `compact` for close-range chrome (e.g. recent orders); board stays glanceable. */
  density?: FlowRowDensity;
};

export function FoodRow({
  itemName,
  quantity,
  view,
  made,
  onToggleMade,
  density = 'board',
}: FoodRowProps) {
  const compact = density === 'compact';
  const qtyMulti = quantity > 1;
  const py = compact ? 'py-1.5' : 'py-[calc(0.55rem+8px)]';

  return (
    <button
      type="button"
      data-flow-row="food"
      data-density={density}
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
        <span
          className={cn(
            'shrink-0 self-center text-center font-bold tabular-nums text-muted-foreground',
            compact ? 'w-4 text-sm' : 'w-5 text-[1.4rem]',
            py,
            qtyMulti && 'text-card-foreground',
          )}
        >
          {quantity}
        </span>
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
          'flex min-w-0 flex-wrap items-center justify-start',
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
              'flow-strike text-muted-foreground italic',
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
