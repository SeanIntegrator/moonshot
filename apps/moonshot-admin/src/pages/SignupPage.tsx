import {
  Alert,
  Box,
  Button,
  IconButton,
  InputAdornment,
  LinearProgress,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useId, useState, type FormEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { buttonLoader } from '../console/primitives/button-loader.js';
import { fieldErrorProps } from '../console/primitives/ValidationMessage.js';
import { useAuth } from '../context/AuthContext.js';
import { getPasswordStrength } from '../lib/onboarding-utils.js';
import { OnboardingShell } from '../components/onboarding/OnboardingShell.js';
import { CafeUrlPreview } from '../components/signup/CafeUrlPreview.js';

const strengthColor = {
  weak: 'error.main',
  fair: 'warning.main',
  strong: 'success.main',
} as const;

export function SignupPage() {
  const navigate = useNavigate();
  const { register, apiConfigured } = useAuth();
  const headingId = useId();

  const [cafeName, setCafeName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState({ email: false, confirm: false });

  const strength = getPasswordStrength(password);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit =
    cafeName.trim().length >= 2 &&
    emailValid &&
    password.length >= 8 &&
    passwordsMatch &&
    !submitting;

  async function handleRegister(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await register({
        cafeName: cafeName.trim(),
        email: email.trim(),
        password,
      });
      // Session + onboarding status are published together; route to wizard immediately.
      navigate('/onboarding', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <OnboardingShell
      title="Create your café"
      subtitle="A few quick steps and you’ll be ready to take orders."
      activeStep={0}
      footer={
        <>
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" underline="hover" color="inherit" sx={{ fontWeight: 600 }}>
            Sign in
          </Link>
        </>
      }
    >
      {!apiConfigured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Set <code>VITE_API_URL</code> to your API origin.
        </Alert>
      )}

      <Box component="form" onSubmit={(e) => void handleRegister(e)} aria-labelledby={headingId}>
        <Typography id={headingId} variant="h3" component="h2" sx={{ mb: 0.5 }}>
          Your account
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
          We’ll use this email to sign you in. You can change café details anytime.
        </Typography>

        <TextField
          fullWidth
          label="Café name"
          placeholder="Clay & Bean"
          value={cafeName}
          onChange={(e) => setCafeName(e.target.value)}
          margin="dense"
          required
          autoFocus
          disabled={submitting}
        />
        <CafeUrlPreview cafeName={cafeName} />

        <TextField
          fullWidth
          label="Email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, email: true }))}
          margin="dense"
          required
          disabled={submitting}
          {...fieldErrorProps(
            touched.email && email.trim() && !emailValid ? 'Enter a valid email address' : null,
          )}
        />

        <TextField
          fullWidth
          label="Password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="dense"
          required
          disabled={submitting}
          helperText="At least 8 characters"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((s) => !s)}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
        />
        {password.length > 0 ? (
          <Box sx={{ mt: 0.5, mb: 0.5 }}>
            <LinearProgress
              variant="determinate"
              value={strength === 'weak' ? 33 : strength === 'fair' ? 66 : 100}
              sx={{
                height: 4,
                borderRadius: 2,
                bgcolor: 'divider',
                '& .MuiLinearProgress-bar': { bgcolor: strengthColor[strength] },
              }}
            />
            <Typography
              variant="caption"
              sx={{ color: strengthColor[strength], mt: 0.5, display: 'block' }}
            >
              {strength.charAt(0).toUpperCase() + strength.slice(1)} password
            </Typography>
          </Box>
        ) : null}

        <TextField
          fullWidth
          label="Confirm password"
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
          margin="dense"
          required
          disabled={submitting}
          {...fieldErrorProps(
            touched.confirm && confirmPassword.length > 0 && !passwordsMatch
              ? 'Passwords do not match'
              : null,
          )}
        />

        {error ? (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        ) : null}

        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          disabled={!canSubmit}
          startIcon={buttonLoader(submitting)}
          sx={{ mt: 2.5 }}
        >
          {submitting ? 'Creating…' : 'Continue'}
        </Button>
      </Box>
    </OnboardingShell>
  );
}
