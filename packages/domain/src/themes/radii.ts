import type { CardStyle } from '@moonshot/types';

/** Named radius scale — keeps cards sane even when controls are pill-shaped. */
export type CafeRadii = {
  /** Elevated card / paper surfaces (px). Never fully round. */
  card: number;
  /** Buttons, chips, option tiles (px). */
  control: number;
  /** Fully round controls (px). */
  pill: number;
};

/**
 * Derive radius scale from café `cardStyle`.
 * `shape.borderRadius` maps to `card` so MuiPaper never becomes a circle under `pill`.
 */
export function radiiFromCardStyle(cardStyle: CardStyle): CafeRadii {
  switch (cardStyle) {
    case 'sharp':
      return { card: 4, control: 4, pill: 999 };
    case 'pill':
      return { card: 16, control: 999, pill: 999 };
    case 'rounded':
    default:
      return { card: 12, control: 14, pill: 999 };
  }
}
