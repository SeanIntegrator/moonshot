import type { FlowLineView } from '@moonshot/types';
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
      className={`flow-row flow-row-food${made ? ' flow-row-made' : ''}`}
      onClick={onToggleMade}
    >
      <div className="flow-col-shot">
        <span className={`flow-qty${qtyMulti ? ' flow-qty-multi' : ''}`}>{quantity}</span>
        <span className={`flow-qty-bar${qtyMulti ? ' flow-qty-bar-multi' : ''}`} aria-hidden />
        <span className="flow-food-name">{itemName}</span>
      </div>
      <div className="flow-col-notes flow-col-notes-wide">
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
