import { FeatureFlagKeys } from '@moonshot/types';
import { useCafe } from './useCafe.js';

export type CafeFeatureFlags = {
  orderAheadEnabled: boolean;
  loyaltyEnabled: boolean;
  pickupTimeEnabled: boolean;
  maxPickupMinutes: number;
};

/**
 * Derived café capability flags for gating order-ahead / loyalty UI.
 * Prefer `activeFeatures` (server-derived) with café feature object as fallback.
 */
export function useCafeFeatures(): CafeFeatureFlags {
  const { cafe, activeFeatures } = useCafe();
  const oa = cafe?.features.order_ahead;

  const orderAheadEnabled =
    activeFeatures.includes(FeatureFlagKeys.orderAhead) || oa?.enabled === true;
  const loyaltyEnabled =
    activeFeatures.includes(FeatureFlagKeys.loyalty) || cafe?.features.loyalty?.enabled === true;

  return {
    orderAheadEnabled,
    loyaltyEnabled,
    pickupTimeEnabled: orderAheadEnabled && oa?.pickupTimeEnabled === true,
    maxPickupMinutes: Number.isFinite(oa?.maxPickupMinutes) ? (oa!.maxPickupMinutes as number) : 60,
  };
}
