import { Alert } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AdminSaveMenuTemplateRequest } from '@moonshot/domain';
import { CafeSettingsStep } from '../components/onboarding/CafeSettingsStep.js';
import { MenuStep } from '../components/onboarding/MenuStep.js';
import { OnboardingShell } from '../components/onboarding/OnboardingShell.js';
import {
  activeProgressIndex,
  deriveAuthenticatedOnboardingStep,
} from '../components/onboarding/onboarding-steps.js';
import { PaymentsStep } from '../components/onboarding/PaymentsStep.js';
import { useAuth } from '../context/AuthContext.js';
import { adminCompleteOnboarding, adminSaveMenuTemplate } from '../lib/admin-api.js';

/**
 * Post-signup wizard. Step is derived from server onboarding status
 * (menu → café settings → payments), not sessionStorage.
 */
export function OnboardingWizard() {
  const navigate = useNavigate();
  const { session, onboardingStatus, refreshOnboardingStatus, markOnboardingCompleted } = useAuth();
  const [stripeReturnNotice] = useState(
    () => new URLSearchParams(window.location.search).get('stripeConnect') === 'return'
  );
  const [busy, setBusy] = useState(false);
  const [menuSetupView, setMenuSetupView] = useState<'choice' | 'template'>('choice');
  const [error, setError] = useState<string | null>(null);

  const authStep = useMemo(
    () => deriveAuthenticatedOnboardingStep(onboardingStatus),
    [onboardingStatus]
  );
  const progressIndex = activeProgressIndex(onboardingStatus);

  // Clear Stripe return query after reading (status refresh is handled in PaymentsStep).
  useEffect(() => {
    if (!stripeReturnNotice) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has('stripeConnect')) {
      params.delete('stripeConnect');
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
  }, [stripeReturnNotice]);

  // Square OAuth may land on /onboarding if redirect URL is origin-only.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('squareConnect')) return;
    navigate(`/onboarding/import-pos?${params.toString()}`, { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (authStep !== 'menu') setMenuSetupView('choice');
  }, [authStep]);

  const saveMenuTemplate = useCallback(
    async (payload: AdminSaveMenuTemplateRequest) => {
      if (!session) return;
      setError(null);
      setBusy(true);
      try {
        await adminSaveMenuTemplate(session.token, payload);
        await refreshOnboardingStatus();
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save menu template');
      } finally {
        setBusy(false);
      }
    },
    [session, refreshOnboardingStatus]
  );

  const finish = useCallback(async () => {
    if (!session) return;
    setError(null);
    setBusy(true);
    try {
      await adminCompleteOnboarding(session.token);
      // POST /complete already succeeded. Stamp completed locally before the
      // status GET so a failed refresh cannot leave completed: false and bounce
      // routing back to this wizard (which remounts PaymentsStep and re-posts).
      markOnboardingCompleted();
      await refreshOnboardingStatus();
      navigate('/overview', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete setup');
      throw e;
    } finally {
      setBusy(false);
    }
  }, [session, markOnboardingCompleted, refreshOnboardingStatus, navigate]);

  if (!session) return null;

  const cafeName = session.cafe.name;
  const titles: Record<typeof authStep, { title: string; subtitle: string }> = {
    menu: {
      title: `Set up ${cafeName}`,
      subtitle: 'Build a starter menu, then confirm hours and how you get paid.',
    },
    cafe: {
      title: `Set up ${cafeName}`,
      subtitle: 'Make your order page feel like yours, and confirm when you’re open.',
    },
    payments: {
      title: `Set up ${cafeName}`,
      subtitle: 'Almost done — choose card payments or take payment in store for now.',
    },
  };
  const copy = titles[authStep];

  return (
    <OnboardingShell
      title={copy.title}
      subtitle={copy.subtitle}
      activeStep={progressIndex}
      maxWidth={authStep === 'cafe' ? 720 : 560}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {authStep === 'menu' ? (
        <MenuStep
          hasMenuItem={Boolean(onboardingStatus?.hasMenuItem)}
          menuSetupView={menuSetupView}
          busy={busy}
          token={session.token}
          onSetMenuSetupView={setMenuSetupView}
          onSaveMenuTemplate={saveMenuTemplate}
          onContinue={() => void refreshOnboardingStatus()}
        />
      ) : null}

      {authStep === 'cafe' ? (
        <CafeSettingsStep
          token={session.token}
          cafeSlug={session.cafe.slug}
          cafeName={cafeName}
          busy={busy}
          onBusy={setBusy}
          onSaved={() => void refreshOnboardingStatus()}
          onError={setError}
        />
      ) : null}

      {authStep === 'payments' ? (
        <PaymentsStep
          token={session.token}
          stripeReturnNotice={stripeReturnNotice}
          busy={busy}
          onComplete={finish}
        />
      ) : null}
    </OnboardingShell>
  );
}
