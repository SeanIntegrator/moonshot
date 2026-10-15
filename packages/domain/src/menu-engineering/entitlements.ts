import type {
  MenuEngineeringEntitlements,
  MenuEngineeringTier,
} from '@moonshot/types';

/**
 * Single entitlement switch for the Menu Engineering tool.
 *
 * Free tier runs stateless extraction, confirmation, and price/structure auditing.
 * Paid tier capabilities are gated here so components never scatter tier checks.
 */
export function resolveMenuEngineeringEntitlements(
  tier: MenuEngineeringTier = 'free',
): MenuEngineeringEntitlements {
  const isPaid = tier === 'paid';
  return {
    tier,
    canExtractAndAuditPricing: true,
    canRestructureMenuLayout: isPaid,
    canRewriteMenuCopy: isPaid,
    canExportPrintTemplates: isPaid,
    canSaveAndHostQrMenu: isPaid,
  };
}
