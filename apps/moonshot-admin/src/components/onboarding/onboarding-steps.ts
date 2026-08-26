import type { AdminOnboardingStatusResponse } from '@moonshot/types';

/** Authenticated onboarding steps after account creation (1-indexed in the UI). */
export const ONBOARDING_STEPS = [
  { id: 'account', label: 'Account', shortLabel: 'Account' },
  { id: 'menu', label: 'Menu', shortLabel: 'Menu' },
  { id: 'cafe', label: 'Café', shortLabel: 'Café' },
  { id: 'payments', label: 'Payments', shortLabel: 'Pay' },
] as const;

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id'];

/**
 * Index into ONBOARDING_STEPS for authenticated wizard screens.
 * Account (0) is only shown on /signup before a session exists.
 */
export type AuthenticatedOnboardingStep = 'menu' | 'cafe' | 'payments';

/**
 * Derive the current authenticated onboarding step from server checklist.
 * Seeded hours alone do not unlock café→payments — hasCafeSettings must be true.
 */
export function deriveAuthenticatedOnboardingStep(
  status: AdminOnboardingStatusResponse | null | undefined,
): AuthenticatedOnboardingStep {
  if (!status?.hasMenuItem) return 'menu';
  if (!status.hasCafeSettings) return 'cafe';
  return 'payments';
}

export function onboardingStepIndex(stepId: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === stepId);
}

/** Active step index for the progress UI (0 = account … 3 = payments). */
export function activeProgressIndex(
  status: AdminOnboardingStatusResponse | null | undefined,
  /** When true, render as account step (signup page). */
  onSignupPage = false,
): number {
  if (onSignupPage || !status) return 0;
  const auth = deriveAuthenticatedOnboardingStep(status);
  if (auth === 'menu') return 1;
  if (auth === 'cafe') return 2;
  return 3;
}
