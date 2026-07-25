import type { FlowLineView } from '@moonshot/types';
import { Fragment } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatAllergenLabel } from './formatAllergen.js';

type DrinkRowProps = {
  itemName: string;
  quantity: number;
  view: FlowLineView;
  made: boolean;
  onToggleMade: () => void;
};

/** Shot tags are joined with ` · ` upstream — split for 2px-gap bracket rendering. */
function ShotBracketLabel({ label, color }: { label: string; color: string }) {
  const parts = label.split(' · ');
  return (
    <span
      className="flow-strike inline-flex items-baseline gap-[2px] font-mono text-xl font-bold tracking-wide uppercase whitespace-nowrap"
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

export function DrinkRow({ itemName, quantity, view, made, onToggleMade }: DrinkRowProps) {
  const hasMods = view.milk != null || view.syrups.length > 0;
  const qtyMulti = quantity > 1;

  return (
    <button
      type="button"
      data-flow-row="drink"
      className={cn(
        'grid w-full cursor-pointer items-stretch gap-0 border-b border-border bg-transparent px-4 text-left text-card-foreground outline-none last:border-b-0 [-webkit-tap-highlight-color:transparent]',
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
          'flex w-full min-w-0 items-stretch gap-2.5 whitespace-nowrap box-border',
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
        <div className="flex min-w-0 flex-col justify-center gap-0.5 py-[calc(0.55rem+8px)]">
          <div className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className="flow-strike text-2xl font-bold">{itemName}</span>
            {view.shotLabel ? (
              <ShotBracketLabel label={view.shotLabel} color={view.beanAccent} />
            ) : null}
          </div>
          {view.sizeLabel ? (
            <span className="flow-strike self-start border-b-2 border-amber-500/80 pb-px text-[0.95rem] font-bold tracking-wide uppercase leading-tight">
              {view.sizeLabel}
            </span>
          ) : null}
        </div>
      </div>

      {hasMods ? (
        <div className="ml-[clamp(28px,5.5vw,44px)] flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden py-[calc(0.55rem+8px)]">
          {view.milk ? (
            <span className="mr-4 inline-flex min-w-32 shrink-0 items-stretch overflow-hidden rounded-[2px]">
              {view.milk.temperature ? (
                <em className="inline-flex items-center bg-[#c8cdd4] px-2 py-2.5 text-[1.15rem] font-semibold italic leading-tight whitespace-nowrap text-[#1a1a1a]">
                  {view.milk.temperature}
                </em>
              ) : null}
              <Badge
                className="h-auto min-w-14 flex-1 justify-center rounded-none px-2.5 py-2.5 text-[1.15rem] font-bold leading-tight"
                style={{ background: view.milk.bg, color: view.milk.text }}
              >
                {view.milk.name}
              </Badge>
              {view.milk.texture ? (
                <em className="inline-flex items-center bg-[#c8cdd4] px-2 py-2.5 text-[1.15rem] font-semibold italic leading-tight whitespace-nowrap text-[#1a1a1a]">
                  {view.milk.texture}
                </em>
              ) : null}
            </span>
          ) : null}
          {view.syrups.map((s, i) => (
            <Badge
              key={`${s.label}-${i}`}
              variant="outline"
              className="h-auto min-w-20 shrink-0 justify-center rounded-full border-[0.5px] px-2.5 py-1 text-[1.15rem] font-normal leading-tight whitespace-nowrap"
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

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-1.5 py-[calc(0.55rem+8px)]">
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
