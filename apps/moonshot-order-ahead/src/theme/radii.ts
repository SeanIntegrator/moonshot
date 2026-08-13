import type { Theme } from '@mui/material/styles';
import type { CafeRadii } from '@moonshot/domain';

export type { CafeRadii } from '@moonshot/domain';
export { radiiFromCardStyle } from '@moonshot/domain';

/**
 * MUI `sx` treats numeric borderRadius as a multiple of `shape.borderRadius`.
 * Use this helper so named radii (already px) land correctly.
 */
export function sxRadius(kind: keyof CafeRadii) {
  return (theme: Theme) => `${theme.radii[kind]}px`;
}
