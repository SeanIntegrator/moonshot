/** Loyalty form checks. Server still validates stamps and reward. */

export function loyaltyRewardError(enabled: boolean, reward: string): string | null {
  if (enabled && reward.trim().length === 0) return 'Enter a reward label.';
  return null;
}

export function loyaltyStampsError(stamps: number): string | null {
  if (!Number.isInteger(stamps) || stamps < 1 || stamps > 50) {
    return 'Stamps must be between 1 and 50.';
  }
  return null;
}

export function isLoyaltyFormValid(input: {
  enabled: boolean;
  stamps: number;
  reward: string;
}): boolean {
  if (!input.enabled) return true;
  return loyaltyStampsError(input.stamps) === null && loyaltyRewardError(true, input.reward) === null;
}

export function doubleStampSummary(days: readonly string[]): string {
  if (days.length === 0) return 'No double stamp days. Everyone gets one stamp per order.';
  if (days.length === 1) return `Two stamps on ${days[0]}.`;
  const rest = days.slice(0, -1).join(', ');
  return `Two stamps on ${rest} and ${days[days.length - 1]}.`;
}
