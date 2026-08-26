import { describe, expect, it } from 'vitest';

/**
 * Completion gate rules mirrored from admin-onboarding /complete.
 * Kept as a pure helper test so the product rule is documented without a live DB.
 */
function canCompleteOnboarding(checklist: {
  hasKdsUser: boolean;
  hasMenuItem: boolean;
  hasCafeSettings: boolean;
}): { ok: true } | { ok: false; reason: string } {
  if (!checklist.hasKdsUser || !checklist.hasMenuItem) {
    return { ok: false, reason: 'menu' };
  }
  if (!checklist.hasCafeSettings) {
    return { ok: false, reason: 'cafe-settings' };
  }
  return { ok: true };
}

describe('onboarding complete gate', () => {
  it('requires menu and café settings confirmation', () => {
    expect(
      canCompleteOnboarding({ hasKdsUser: true, hasMenuItem: false, hasCafeSettings: false }),
    ).toEqual({ ok: false, reason: 'menu' });
    expect(
      canCompleteOnboarding({ hasKdsUser: true, hasMenuItem: true, hasCafeSettings: false }),
    ).toEqual({ ok: false, reason: 'cafe-settings' });
    expect(
      canCompleteOnboarding({ hasKdsUser: true, hasMenuItem: true, hasCafeSettings: true }),
    ).toEqual({ ok: true });
  });
});
