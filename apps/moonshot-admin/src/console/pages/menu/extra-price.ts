/** Square-locked extra column: Free / +50p / +£1.20 */
export function formatExtraMinor(minor: number): string {
  if (minor <= 0) return 'Free';
  if (minor < 100) return `+${minor}p`;
  const pounds = (minor / 100).toFixed(2);
  return `+£${pounds}`;
}

export function poundsToMinor(raw: string): number {
  const v = Number.parseFloat(raw);
  if (!Number.isFinite(v) || v <= 0) return 0;
  return Math.round(v * 100);
}

export function minorToPoundsInput(minor: number): string {
  return (Math.max(0, minor) / 100).toFixed(2);
}

/** Modifier extra field — empty when free so the user types a value instead of deleting 0.00. */
export function extraPoundsInput(minor: number): string {
  if (minor <= 0) return '';
  return minorToPoundsInput(minor);
}
