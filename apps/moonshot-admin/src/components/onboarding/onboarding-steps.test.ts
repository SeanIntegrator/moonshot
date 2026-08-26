import { describe, expect, it } from 'vitest';
import type { AdminOnboardingStatusResponse } from '@moonshot/types';
import {
  activeProgressIndex,
  deriveAuthenticatedOnboardingStep,
} from './onboarding-steps.js';

function status(
  partial: Partial<AdminOnboardingStatusResponse>,
): AdminOnboardingStatusResponse {
  return {
    completed: false,
    hasKdsUser: true,
    hasMenuItem: false,
    hasCafeSettings: false,
    ...partial,
  };
}

describe('deriveAuthenticatedOnboardingStep', () => {
  it('starts on menu until a menu item exists', () => {
    expect(deriveAuthenticatedOnboardingStep(status({}))).toBe('menu');
    expect(deriveAuthenticatedOnboardingStep(null)).toBe('menu');
  });

  it('moves to café settings after menu but before confirmation', () => {
    expect(
      deriveAuthenticatedOnboardingStep(status({ hasMenuItem: true, hasCafeSettings: false })),
    ).toBe('cafe');
  });

  it('moves to payments once café settings are confirmed', () => {
    expect(
      deriveAuthenticatedOnboardingStep(status({ hasMenuItem: true, hasCafeSettings: true })),
    ).toBe('payments');
  });
});

describe('activeProgressIndex', () => {
  it('keeps signup on account step', () => {
    expect(activeProgressIndex(null, true)).toBe(0);
    expect(activeProgressIndex(status({ hasMenuItem: true }), true)).toBe(0);
  });

  it('maps authenticated checklist to steps 1–3', () => {
    expect(activeProgressIndex(status({}))).toBe(1);
    expect(activeProgressIndex(status({ hasMenuItem: true }))).toBe(2);
    expect(activeProgressIndex(status({ hasMenuItem: true, hasCafeSettings: true }))).toBe(3);
  });
});
