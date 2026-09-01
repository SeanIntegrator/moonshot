import type { FlowLineView } from '@moonshot/domain';
import type { OrderType } from '@moonshot/types';
import { CheckSquare, Square } from 'lucide-react';
import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FulfillmentQtyCell } from './FulfillmentQtyCell.js';
import { formatAllergenLabel } from './formatAllergen.js';
import { formatItemName } from './formatItemName.js';

export type FlowRowDensity = 'board' | 'compact';

type DrinkRowProps = {
  itemName: string;
  quantity: number;
  view: FlowLineView;
  made: boolean;
  onToggleMade: () => void;
  /** Drop bottom border when the cream FOOD strip sits directly below. */
  hideBottomBorder?: boolean;
  /** `compact` for close-range chrome (e.g. recent orders); board stays glanceable. */
  density?: FlowRowDensity;
  /** Checkbox affordance for recall line selection; `made` is the inverse of selected. */
  showSelectControl?: boolean;
  /**
   * Order-level fulfillment (preview until per-line cups exist).
   * Required on the live board; optional in compact recall rows.
   */
  orderType?: OrderType;
  /** Cup icon beside qty on mixed tickets only. */
  showFulfillmentIcon?: boolean;
  /** Live 86'd modifier option ids — greys matching chips. */
  outOptionIds?: ReadonlySet<string>;
};

/** Shot tags are joined with ` · ` upstream — split for 2px-gap bracket rendering. */
function ShotBracketLabel({
  label,
  color,
  compact,
}: {
  label: string;
  color: string;
  compact: boolean;
}) {
  const parts = label.split(' · ');
  return (
    <span
      className={cn(
        'flow-strike inline-flex items-baseline gap-[2px] font-mono font-bold tracking-wide uppercase whitespace-nowrap',
        compact ? 'text-xs' : 'text-xl',
      )}
      style={{ color }}
    >
      <span>[</span>
      {parts.map((part, i) => (
        <Fragment key={`${part}-${i}`}>
          {i > 0 ? <span>·</span> : null}
          <span>{part}</span>
        </Fragment>
      ))}
      <span>]</span>
    </span>
  );
}

export function DrinkRow({
  itemName,
  quantity,
  view,
  made,
  onToggleMade,
  hideBottomBorder = false,
  density = 'board',
  showSelectControl = false,
  orderType = 'takeaway',
  showFulfillmentIcon = false,
  outOptionIds,
}: DrinkRowProps) {
  const displayName = formatItemName(itemName);
  const compact = density === 'compact';
  const hasMods = view.milk != null || view.syrups.length > 0;
  const qtyMulti = quantity > 1;
  const py = compact ? 'py-1.5' : 'py-[calc(0.55rem+8px)]';

  return (
    <button
      type="button"
      data-flow-row="drink"
      data-density={density}
      aria-pressed={showSelectControl ? !made : undefined}
      className={cn(
        'grid w-full cursor-pointer items-stretch gap-0 bg-transparent text-left text-card-foreground outline-none [-webkit-tap-highlight-color:transparent]',
        compact ? 'px-3' : 'px-4',
        !hideBottomBorder && 'border-b border-border last:border-b-0',
        hasMods
          ? 'grid-cols-[var(--flow-shot-col-width,minmax(10rem,auto))_minmax(9rem,auto)_minmax(0,1fr)]'
          : 'grid-cols-[var(--flow-shot-col-width,minmax(10rem,auto))_minmax(0,1fr)]',
        made && 'opacity-45 [&_.flow-strike]:line-through',
      )}
      onClick={onToggleMade}
    >
      <div
        data-flow-col="shot"
        className={cn(
          'flex w-full min-w-0 items-stretch whitespace-nowrap box-border',
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
          showIcon={showFulfillmentIcon}
          compact={compact}
          qtyMulti={qtyMulti}
          className={py}
        />
        <span
          className={cn('w-px shrink-0 self-stretch bg-border', qtyMulti && 'w-0.5 bg-foreground/50')}
          aria-hidden
        />
        <div className={cn('flex min-w-0 flex-col justify-center', compact ? 'gap-0' : 'gap-0.5', py)}>
          <div className={cn('flex items-baseline whitespace-nowrap', compact ? 'gap-1' : 'gap-1.5')}>
            <span className={cn('flow-strike font-bold', compact ? 'text-sm' : 'text-2xl')}>
              {displayName}
            </span>
            {view.shotLabel ? (
              <ShotBracketLabel label={view.shotLabel} color={view.beanAccent} compact={compact} />
            ) : null}
          </div>
          {view.sizeLabel ? (
            <span
              className={cn(
                'flow-strike self-start border-b-2 border-amber-500/80 pb-px font-bold tracking-wide uppercase leading-tight',
                compact ? 'text-[0.65rem]' : 'text-[0.95rem]',
              )}
            >
              {view.sizeLabel}
            </span>
          ) : null}
        </div>
      </div>

      {hasMods ? (
        <div
          className={cn(
            'flex min-w-0 flex-nowrap items-center overflow-hidden',
            compact
              ? 'ml-3 gap-1.5 py-1.5'
              : 'ml-[clamp(28px,5.5vw,44px)] gap-2 py-[calc(0.55rem+8px)]',
          )}
        >
          {view.milk ? (
            <span
              className={cn(
                'inline-flex shrink-0 items-stretch overflow-hidden rounded-[2px]',
                compact ? 'mr-2 min-w-24' : 'mr-4 min-w-32',
                view.milk.optionId && outOptionIds?.has(view.milk.optionId) && 'opacity-40',
              )}
            >
              {view.milk.temperature ? (
                <em
                  className={cn(
                    'inline-flex items-center bg-[#c8cdd4] font-semibold italic leading-tight whitespace-nowrap text-[#1a1a1a]',
                    compact ? 'px-1.5 py-1 text-xs' : 'px-2 py-2.5 text-[1.15rem]',
                  )}
                >
                  {view.milk.temperature}
                </em>
              ) : null}
              <Badge
                className={cn(
                  'h-auto flex-1 justify-center rounded-none font-bold leading-tight',
                  compact
                    ? 'min-w-10 px-1.5 py-1 text-xs'
                    : 'min-w-14 px-2.5 py-2.5 text-[1.15rem]',
                )}
                style={{ background: view.milk.bg, color: view.milk.text }}
              >
                {view.milk.name}
              </Badge>
              {view.milk.texture ? (
                <em
                  className={cn(
                    'inline-flex items-center bg-[#c8cdd4] font-semibold italic leading-tight whitespace-nowrap text-[#1a1a1a]',
                    compact ? 'px-1.5 py-1 text-xs' : 'px-2 py-2.5 text-[1.15rem]',
                  )}
                >
                  {view.milk.texture}
                </em>
              ) : null}
            </span>
          ) : null}
          {view.syrups.map((s, i) => (
            <Badge
              key={`${s.label}-${i}`}
              variant="outline"
              className={cn(
                'h-auto shrink-0 justify-center rounded-full border-[0.5px] font-normal leading-tight whitespace-nowrap',
                compact
                  ? 'min-w-14 px-1.5 py-0.5 text-xs'
                  : 'min-w-20 px-2.5 py-1 text-[1.15rem]',
                s.optionId && outOptionIds?.has(s.optionId) && 'opacity-40',
              )}
              style={{
                borderColor: s.colorHex ?? '#4a3f6b',
                background: `color-mix(in srgb, ${s.colorHex ?? '#4a3f6b'} 20%, transparent)`,
              }}
            >
              {s.label}
            </Badge>
          ))}
        </div>
      ) : null}

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
