import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Link,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MenuSetupChoice } from '../components/onboarding/MenuSetupChoice.js';
import { MenuTemplateStep } from '../components/onboarding/MenuTemplateStep.js';
import { StripePaymentsCard } from '../components/StripePaymentsCard.js';
import { useAuth } from '../context/AuthContext.js';
import {
  adminCompleteOnboarding,
  adminCreateKdsUser,
  adminSaveMenuTemplate,
} from '../lib/admin-api.js';
import type { AdminSaveMenuTemplateRequest } from '@moonshot/types';
import { getKdsBaseUrl, getOrderAheadBaseUrl } from '../lib/onboarding-utils.js';

const STEPS = ['Welcome', 'Kitchen', 'Menu', 'Payments', 'Go live'];

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

const fieldSx = {
  '& .MuiOutlinedInput-root fieldset': { borderColor: '#d4d4d8' },
};

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { session, onboardingStatus, refreshOnboardingStatus } = useAuth();
  const [step, setStep] = useState(() =>
    session?.cafe.id ? readStoredStep(session.cafe.id) : 0,
  );
  const [stripeReturnNotice, setStripeReturnNotice] = useState(
    () => new URLSearchParams(window.location.search).get('stripeConnect') === 'return',
  );
  const [kdsUsername, setKdsUsername] = useState('barista');
  const [kdsPassword, setKdsPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [menuSetupView, setMenuSetupView] = useState<'choice' | 'template'>('choice');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    sessionStorage.setItem(stepStorageKey(session.cafe.id), String(step));
  }, [step, session]);

  useEffect(() => {
    if (step !== 2) setMenuSetupView('choice');
  }, [step]);

  // Full-page Stripe redirect remounts the wizard — restore payments/go-live step.
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
    const targetStep =
      onboardingStatus?.hasKdsUser && onboardingStatus?.hasMenuItem ? 4 : 3;
    setStep((prev) => Math.max(prev, targetStep));
  }, [stripeReturnNotice, onboardingStatus]);

  if (!session) return null;

  const orderUrl = `${getOrderAheadBaseUrl()}/${session.cafe.slug}`;
  const kdsUrl = getKdsBaseUrl();

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }

  const saveKds = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await adminCreateKdsUser(session!.token, {
        username: kdsUsername.trim(),
        password: kdsPassword,
      });
      await refreshOnboardingStatus();
      setStep(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create kitchen login');
    } finally {
      setBusy(false);
    }
  }, [session, kdsUsername, kdsPassword, refreshOnboardingStatus]);

  const saveMenuTemplate = useCallback(
    async (payload: AdminSaveMenuTemplateRequest) => {
      setError(null);
      setBusy(true);
      try {
        await adminSaveMenuTemplate(session!.token, payload);
        await refreshOnboardingStatus();
        setStep(3);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to save menu template');
      } finally {
        setBusy(false);
      }
    },
    [session, refreshOnboardingStatus],
  );

  const finish = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      await adminCompleteOnboarding(session!.token);
      await refreshOnboardingStatus();
      sessionStorage.removeItem(stepStorageKey(session!.cafe.id));
      navigate('/', { replace: true });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not complete setup');
    } finally {
      setBusy(false);
    }
  }, [session, refreshOnboardingStatus, navigate]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
      <Box sx={{ maxWidth: 640, mx: 'auto', px: 2 }}>
        <Typography variant="h5" component="h1" sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, mb: 1 }}>
          Set up {session.cafe.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          About 5 minutes to go live.
        </Typography>
        <Stepper activeStep={step} alternativeLabel sx={{ mb: 4 }}>
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

        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {step === 0 && (
          <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>
              You&apos;re live.
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Your café workspace is ready. Next: kitchen login, your starter menu, and optional
              online payments.
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              Your order-ahead URL
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField fullWidth size="small" value={orderUrl} InputProps={{ readOnly: true }} />
              <Button variant="outlined" onClick={() => void copyText('order', orderUrl)}>
                {copied === 'order' ? 'Copied' : 'Copy'}
              </Button>
            </Box>
            <Button variant="contained" fullWidth onClick={() => setStep(1)}>
              Continue
            </Button>
          </Box>
        )}

        {step === 1 && (
          <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>
              Kitchen login
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Your baristas use this on the kitchen tablet. They&apos;ll also enter your café slug:{' '}
              <strong>{session.cafe.slug}</strong>
            </Typography>
            <TextField
              fullWidth
              label="KDS username"
              value={kdsUsername}
              onChange={(e) => setKdsUsername(e.target.value)}
              margin="normal"
              sx={fieldSx}
            />
            <TextField
              fullWidth
              label="KDS password"
              type="password"
              value={kdsPassword}
              onChange={(e) => setKdsPassword(e.target.value)}
              margin="normal"
              helperText="At least 8 characters"
              sx={fieldSx}
            />
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="outlined" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button
                variant="contained"
                fullWidth
                disabled={busy || kdsPassword.length < 8 || kdsUsername.trim().length < 2}
                onClick={() => void saveKds()}
              >
                {busy ? <CircularProgress size={22} /> : 'Save & continue'}
              </Button>
            </Box>
          </Box>
        )}

        {step === 2 &&
          (onboardingStatus?.hasMenuItem ? (
            <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3, boxShadow: 1 }}>
              <Typography variant="h6" gutterBottom>
                Starter menu saved
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Your menu is ready for customers. You can add specialty items from the dashboard
                after setup.
              </Typography>
              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button variant="outlined" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button variant="contained" fullWidth onClick={() => setStep(3)}>
                  Continue
                </Button>
              </Box>
            </Box>
          ) : menuSetupView === 'choice' ? (
            <MenuSetupChoice
              onEditTemplate={() => setMenuSetupView('template')}
              onImportPos={() => navigate('/onboarding/import-pos')}
              onBack={() => setStep(1)}
            />
          ) : (
            <MenuTemplateStep
              busy={busy}
              onBack={() => setMenuSetupView('choice')}
              onSave={saveMenuTemplate}
            />
          ))}

        {step === 3 && (
          <Box>
            <StripePaymentsCard token={session.token} stripeReturnNotice={stripeReturnNotice} />
            <Box sx={{ mt: 2, textAlign: 'center' }}>
              <Link
                component="button"
                type="button"
                variant="body2"
                onClick={() => setStep(4)}
                sx={{ cursor: 'pointer' }}
              >
                {stripeReturnNotice ? 'Continue to go live' : 'Skip — pay in store for now'}
              </Link>
            </Box>
            <Button variant="outlined" sx={{ mt: 2 }} onClick={() => setStep(2)}>
              Back
            </Button>
          </Box>
        )}

        {step === 4 && (
          <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>
              Go live
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Share these links with your team and customers.
            </Typography>
            <Typography variant="subtitle2">Order-ahead</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField fullWidth size="small" value={orderUrl} InputProps={{ readOnly: true }} />
              <Button variant="outlined" onClick={() => void copyText('order2', orderUrl)}>
                {copied === 'order2' ? 'Copied' : 'Copy'}
              </Button>
            </Box>
            <Typography variant="subtitle2">Kitchen display</Typography>
            <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
              <TextField fullWidth size="small" value={kdsUrl} InputProps={{ readOnly: true }} />
              <Button variant="outlined" onClick={() => void copyText('kds', kdsUrl)}>
                {copied === 'kds' ? 'Copied' : 'Copy'}
              </Button>
            </Box>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              KDS login uses café slug: <strong>{session.cafe.slug}</strong>
            </Typography>
            <Button
              variant="contained"
              fullWidth
              size="large"
              disabled={busy}
              onClick={() => void finish()}
            >
              {busy ? 'Finishing…' : 'Enter dashboard'}
            </Button>
          </Box>
        )}
      </Box>
    </Box>
  );
}
