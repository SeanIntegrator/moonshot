/** Pickup minutes: earliest must not exceed furthest (server allows equal). */

export function pickupTimingError(earliest: number, furthest: number): string | null {
  if (!Number.isInteger(earliest) || !Number.isInteger(furthest) || earliest < 1 || furthest < 1) {
    return 'Furthest ahead must be more than earliest pickup.';
  }
  if (earliest > furthest) return 'Furthest ahead must be more than earliest pickup.';
  return null;
}

export function isPickupTimingValid(earliest: number, furthest: number): boolean {
  return pickupTimingError(earliest, furthest) === null;
}
