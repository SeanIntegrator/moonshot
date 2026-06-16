import { Alert, Box, Step, StepLabel, Stepper } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell.js';
import { SignupStepAccount } from '../components/signup/SignupStepAccount.js';
import { SignupStepCafe } from '../components/signup/SignupStepCafe.js';
import { SignupStepConfirm } from '../components/signup/SignupStepConfirm.js';
import { useAuth } from '../context/AuthContext.js';

const STEPS = ['Café', 'Account', 'Confirm'];
const STORAGE_KEY = 'moonshot_signup_draft';

type Draft = {
  step: number;
  cafeName: string;
  cafeSlug: string;
  timezone: string;
  slugTouched: boolean;
  email: string;
  password: string;
  confirmPassword: string;
};

function loadDraft(): Partial<Draft> {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<Draft>) : {};
  } catch {
    return {};
  }
}

function saveDraft(draft: Draft): void {
  try {
    const { password, confirmPassword, ...safe } = draft;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...safe, password: '', confirmPassword: '' }));
  } catch {
    /* ignore */
  }
}

export function SignupPage() {
  const navigate = useNavigate();
  const { register, apiConfigured } = useAuth();
  const saved = loadDraft();

  const [step, setStep] = useState(saved.step ?? 0);
  const [cafeName, setCafeName] = useState(saved.cafeName ?? '');
  const [cafeSlug, setCafeSlug] = useState(saved.cafeSlug ?? '');
  const [timezone, setTimezone] = useState(saved.timezone ?? 'Europe/London');
  const [slugTouched, setSlugTouched] = useState(saved.slugTouched ?? false);
  const [email, setEmail] = useState(saved.email ?? '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    saveDraft({
      step,
      cafeName,
      cafeSlug,
      timezone,
      slugTouched,
      email,
      password,
      confirmPassword,
    });
  }, [step, cafeName, cafeSlug, timezone, slugTouched, email, password, confirmPassword]);

  const handleRegister = useCallback(async () => {
    setError(null);
    if (!password || password.length < 8) {
      setError('Your password was lost — go back to Account and re-enter it.');
      setStep(1);
      return;
    }
    setSubmitting(true);
    try {
      await register({
        cafeName: cafeName.trim(),
        cafeSlug: cafeSlug.trim().toLowerCase(),
        email: email.trim(),
        password,
        timezone,
      });
      sessionStorage.removeItem(STORAGE_KEY);
      setSuccess(true);
      setTimeout(() => navigate('/onboarding', { replace: true }), 700);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setError(msg);
      if (msg.toLowerCase().includes('email')) setStep(1);
      else if (msg.toLowerCase().includes('slug') || msg.toLowerCase().includes('url')) setStep(0);
    } finally {
      setSubmitting(false);
    }
  }, [register, cafeName, cafeSlug, email, password, timezone, navigate]);

  return (
    <AuthShell title="Create your café" subtitle="Get order-ahead, KDS, and admin in one workspace.">
      {!apiConfigured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Set <code>VITE_API_URL</code> to your API origin.
        </Alert>
      )}
      <Stepper activeStep={step} alternativeLabel sx={{ mb: 3 }}>
        {STEPS.map((label, i) => (
          <Step key={label} completed={step > i}>
            <StepLabel
              sx={{
                '& .MuiStepLabel-label': { color: '#71717a' },
                '& .MuiStepLabel-label.Mui-active': { color: '#e8ff47' },
                '& .MuiStepLabel-label.Mui-completed': { color: '#f4f4f5' },
              }}
            >
              {label}
            </StepLabel>
          </Step>
        ))}
      </Stepper>
      <Box aria-current={step === 0 ? 'step' : undefined}>
        {step === 0 && (
          <SignupStepCafe
            cafeName={cafeName}
            cafeSlug={cafeSlug}
            timezone={timezone}
            slugTouched={slugTouched}
            onCafeNameChange={setCafeName}
            onCafeSlugChange={setCafeSlug}
            onSlugTouched={() => setSlugTouched(true)}
            onTimezoneChange={setTimezone}
            onContinue={() => setStep(1)}
          />
        )}
        {step === 1 && (
          <SignupStepAccount
            email={email}
            password={password}
            confirmPassword={confirmPassword}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onConfirmPasswordChange={setConfirmPassword}
            onBack={() => setStep(0)}
            onContinue={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <SignupStepConfirm
            cafeName={cafeName}
            cafeSlug={cafeSlug}
            email={email}
            submitting={submitting}
            error={error}
            success={success}
            onBack={() => setStep(1)}
            onSubmit={() => void handleRegister()}
          />
        )}
      </Box>
    </AuthShell>
  );
}
