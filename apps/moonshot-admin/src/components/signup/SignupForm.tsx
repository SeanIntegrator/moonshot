import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { useId, useState, type FormEvent } from 'react';
import { getPasswordStrength } from '../../lib/onboarding-utils.js';
import { CafeUrlPreview } from './CafeUrlPreview.js';

type Props = {
  cafeName: string;
  email: string;
  password: string;
  confirmPassword: string;
  submitting: boolean;
  error: string | null;
  success: boolean;
  onCafeNameChange: (v: string) => void;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onSubmit: () => void;
};

const strengthColor = {
  weak: 'error.main',
  fair: 'warning.main',
  strong: 'success.main',
} as const;

export function SignupForm({
  cafeName,
  email,
  password,
  confirmPassword,
  submitting,
  error,
  success,
  onCafeNameChange,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}: Props) {
  const headingId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const strength = getPasswordStrength(password);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canSubmit =
    cafeName.trim().length >= 2 &&
    emailValid &&
    password.length >= 8 &&
    passwordsMatch &&
    !submitting;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit();
  }

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }} aria-live="polite">
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Café created!
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 1
          }}>
          Setting up your workspace…
        </Typography>
        <CircularProgress size={24} color="primary" sx={{ mt: 3 }} />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} aria-labelledby={headingId}>
      <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
        Get started
      </Typography>
      <TextField
        fullWidth
        label="Café name"
        placeholder="Clay & Bean"
        value={cafeName}
        onChange={(e) => onCafeNameChange(e.target.value)}
        margin="normal"
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
        onChange={(e) => onEmailChange(e.target.value)}
        margin="normal"
        required
        disabled={submitting}
      />
      <TextField
        fullWidth
        label="Password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
        margin="normal"
        required
        disabled={submitting}
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
          }
        }}
      />
      {password.length > 0 && (
        <Box sx={{ mt: 1 }}>
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
      )}
      <TextField
        fullWidth
        label="Confirm password"
        type={showPassword ? 'text' : 'password'}
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => onConfirmPasswordChange(e.target.value)}
        margin="normal"
        required
        disabled={submitting}
        error={confirmPassword.length > 0 && !passwordsMatch}
        helperText={
          confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : ' '
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Button
        type="submit"
        variant="contained"
        fullWidth
        size="large"
        disabled={!canSubmit}
        sx={{ mt: 1 }}
      >
        {submitting ? (
          <>
            <CircularProgress size={18} sx={{ color: 'primary.contrastText', mr: 1 }} />
            Creating…
          </>
        ) : (
          'Create my café'
        )}
      </Button>
    </Box>
  );
}
