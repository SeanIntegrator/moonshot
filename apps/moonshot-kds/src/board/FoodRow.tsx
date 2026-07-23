import type { FlowLineView } from '@moonshot/types';
import { cn } from '@/lib/utils';
import { formatAllergenLabel } from './formatAllergen.js';

type FoodRowProps = {
  itemName: string;
  quantity: number;
  view: FlowLineView;
  made: boolean;
  onToggleMade: () => void;
};

export function FoodRow({ itemName, quantity, view, made, onToggleMade }: FoodRowProps) {
  const qtyMulti = quantity > 1;

  return (
    <button
      type="button"
      data-flow-row="food"
      className={cn(
        'grid w-full cursor-pointer grid-cols-[minmax(10rem,auto)_minmax(0,1fr)] items-stretch gap-0 border-b border-border bg-transparent px-4 text-left text-card-foreground outline-none last:border-b-0 [-webkit-tap-highlight-color:transparent]',
        made && 'opacity-45 [&_.flow-strike]:line-through',
      )}
      onClick={onToggleMade}
    >
      <div
        data-flow-col="shot"
        className={cn(
          'flex min-w-0 items-stretch gap-2.5 whitespace-nowrap',
          qtyMulti && 'bg-muted/40',
        )}
      >
        <span
          className={cn(
            'w-5 shrink-0 self-center py-[calc(0.55rem+8px)] text-center text-[1.4rem] font-bold tabular-nums text-muted-foreground',
            qtyMulti && 'text-card-foreground',
          )}
        >
          {quantity}
        </span>
        <span
          className={cn('w-px shrink-0 self-stretch bg-border', qtyMulti && 'w-0.5 bg-foreground/50')}
          aria-hidden
        />
        <span className="flow-strike self-center py-[calc(0.55rem+8px)] text-2xl font-semibold italic">
          {itemName}
        </span>
      </div>
      <div className="flex min-w-0 flex-wrap items-center justify-start gap-1.5 py-[calc(0.55rem+8px)]">
        {view.allergens.length > 0 ? (
          <span className="flow-strike flow-allergen">
            {view.allergens.map(formatAllergenLabel).join(', ')}
          </span>
        ) : null}
        {view.notes?.trim() ? (
          <span className="flow-strike text-[1.05rem] text-muted-foreground italic">
            {view.notes.trim()}
          </span>
        ) : null}
      </div>
    </button>
  );
}
