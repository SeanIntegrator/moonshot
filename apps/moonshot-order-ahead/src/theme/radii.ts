import type { CardStyle } from '@moonshot/types';
import type { Theme } from '@mui/material/styles';

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

/**
 * MUI `sx` treats numeric borderRadius as a multiple of `shape.borderRadius`.
 * Use this helper so named radii (already px) land correctly.
 */
export function sxRadius(kind: keyof CafeRadii) {
  return (theme: Theme) => `${theme.radii[kind]}px`;
}
