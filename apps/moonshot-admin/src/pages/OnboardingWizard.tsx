import { Alert, Step, StepLabel, Stepper } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandShell } from '../components/BrandShell.js';
import { MenuStep } from '../components/onboarding/MenuStep.js';
import { PaymentsStep } from '../components/onboarding/PaymentsStep.js';
import { useAuth } from '../context/AuthContext.js';
import { adminCompleteOnboarding, adminSaveMenuTemplate } from '../lib/admin-api.js';
import type { AdminSaveMenuTemplateRequest } from '@moonshot/domain';

const STEPS = ['Menu', 'Payments'] as const;

function stepStorageKey(cafeId: string): string {
  return `moonshot_onboarding_step_${cafeId}`;
}

function readStoredStep(cafeId: string): number {
  try {
    const raw = sessionStorage.getItem(stepStorageKey(cafeId));
    const n = raw ? parseInt(raw, 10) : 0;
    return Number.isFinite(n) && n >= 0 && n < STEPS.length ? n : 0;
  } catch {
    return 0;
  }
}

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { session, onboardingStatus, refreshOnboardingStatus } = useAuth();
  const [step, setStep] = useState(() =>
    session?.cafe.id ? readStoredStep(session.cafe.id) : 0,
  );
  const [stripeReturnNotice] = useState(
    () => new URLSearchParams(window.location.search).get('stripeConnect') === 'return',
  );
  const [busy, setBusy] = useState(false);
  const [menuSetupView, setMenuSetupView] = useState<'choice' | 'template'>('choice');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    sessionStorage.setItem(stepStorageKey(session.cafe.id), String(step));
  }, [step, session]);

  useEffect(() => {
    if (step !== 0) setMenuSetupView('choice');
  }, [step]);

  // Menu already provisioned (e.g. Square return) → land on payments.
  useEffect(() => {
    if (onboardingStatus?.hasMenuItem) {
      setStep((prev) => Math.max(prev, 1));
    }
  }, [onboardingStatus?.hasMenuItem]);

  // Full-page Stripe redirect remounts the wizard — land on payments.
  useEffect(() => {
    if (!stripeReturnNotice) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('stripeConnect')) {
      params.delete('stripeConnect');
      const qs = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${qs ? `?${qs}` : ''}`,
      );
    }
    setStep(1);
  }, [stripeReturnNotice]);

  // Square OAuth may land on /onboarding if redirect URL is origin-only.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('squareConnect')) return;
    navigate(`/onboarding/import-pos?${params.toString()}`, { replace: true });
  }, [navigate]);

  const saveMenuTemplate = useCallback(
    async (payload: AdminSaveMenuTemplateRequest) => {
      if (!session) return;
      setError(null);
      setBusy(true);
      try {
        await adminSaveMenuTemplate(session.token, payload);
        await refreshOnboardingStatus();
        setStep(1);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save menu template');
      } finally {
        setBusy(false);
      }
    },
    [session, refreshOnboardingStatus],
  );

  const finish = useCallback(async () => {
    if (!session) return;
    setError(null);
    setBusy(true);
    try {
      await adminCompleteOnboarding(session.token);
      await refreshOnboardingStatus();
      sessionStorage.removeItem(stepStorageKey(session.cafe.id));
      navigate('/', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete setup');
    } finally {
      setBusy(false);
    }
  }, [session, refreshOnboardingStatus, navigate]);

  if (!session) return null;

  const cafeName = session.cafe.name;

  return (
    <BrandShell
      title={`Set up ${cafeName}`}
      subtitle="A couple of steps and you're ready for orders."
      maxWidth={640}
      stepper={
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map((label, i) => (
            <Step key={label} completed={step > i}>
              <StepLabel
                onClick={() => i < step && setStep(i)}
                sx={{ cursor: i < step ? 'pointer' : 'default' }}
              >
                {label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      }
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {step === 0 && (
        <MenuStep
          hasMenuItem={Boolean(onboardingStatus?.hasMenuItem)}
          menuSetupView={menuSetupView}
          busy={busy}
          token={session.token}
          onSetMenuSetupView={setMenuSetupView}
          onSaveMenuTemplate={saveMenuTemplate}
          onContinueToPayments={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <PaymentsStep
          token={session.token}
          stripeReturnNotice={stripeReturnNotice}
          busy={busy}
          onFinish={() => void finish()}
        />
      )}
    </BrandShell>
  );
}
