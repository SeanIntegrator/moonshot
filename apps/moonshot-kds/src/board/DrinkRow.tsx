import type { FlowLineView } from '@moonshot/types';
import { formatAllergenLabel } from './formatAllergen.js';

type DrinkRowProps = {
  itemName: string;
  quantity: number;
  view: FlowLineView;
  made: boolean;
  onToggleMade: () => void;
};

export function DrinkRow({ itemName, quantity, view, made, onToggleMade }: DrinkRowProps) {
  const hasMods = view.milk != null || view.syrups.length > 0;
  const qtyMulti = quantity > 1;

  return (
    <button
      type="button"
      className={[
        'flow-row',
        'flow-row-drink',
        made ? 'flow-row-made' : '',
        hasMods ? '' : 'flow-row-no-mods',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onToggleMade}
    >
      <div className="flow-col-shot">
        <span className={`flow-qty${qtyMulti ? ' flow-qty-multi' : ''}`}>{quantity}</span>
        <span className={`flow-qty-bar${qtyMulti ? ' flow-qty-bar-multi' : ''}`} aria-hidden />
        <div className="flow-shot-body">
          <div className="flow-shot-name-row">
            <span className="flow-item-name">{itemName}</span>
            {view.shotLabel ? (
              <span className="flow-shot-brackets" style={{ color: view.beanAccent }}>
                [{view.shotLabel}]
              </span>
            ) : null}
          </div>
          {view.sizeLabel ? <span className="flow-size">{view.sizeLabel}</span> : null}
        </div>
      </div>

      {hasMods ? (
        <div className="flow-col-mods">
          {view.milk ? (
            <span className="flow-milk-wrap">
              {view.milk.temperature ? (
                <em className="flow-milk-adj" style={{ color: view.milk.bg }}>
                  {view.milk.temperature}
                </em>
              ) : null}
              <span
                className="flow-milk-chip"
                style={{ background: view.milk.bg, color: view.milk.text }}
              >
                {view.milk.name}
              </span>
              {view.milk.texture ? (
                <em className="flow-milk-adj" style={{ color: view.milk.bg }}>
                  {view.milk.texture}
                </em>
              ) : null}
            </span>
          ) : null}
          {view.syrups.map((s, i) => (
            <span
              key={`${s.label}-${i}`}
              className="flow-syrup-chip"
              style={{ ['--syrup' as string]: s.colorHex ?? '#4a3f6b' }}
            >
              {s.label}
            </span>
          ))}
        </div>
      ) : null}

      <div className="flow-col-notes">
        {view.allergens.length > 0 ? (
          <span className="flow-allergen">
            {view.allergens.map(formatAllergenLabel).join(', ')}
          </span>
        ) : null}
        {view.notes?.trim() ? (
          <span className="flow-freetext">{view.notes.trim()}</span>
        ) : null}
      </div>
    </button>
  );
}
