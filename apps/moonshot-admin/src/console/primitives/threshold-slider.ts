/** Dual-thumb order-age slider: thumbs cannot cross. */
export function clampThresholds(
  amberAfter: number,
  lateAfter: number,
  maxMinutes: number,
): [number, number] {
  const max = Math.max(2, maxMinutes);
  const amber = Math.max(1, Math.min(amberAfter, max - 1));
  const late = Math.max(amber + 1, Math.min(lateAfter, max));
  return [amber, late];
}
