import {
  Box,
  Button,
  IconButton,
  InputAdornment,
  LinearProgress,
  TextField,
  Typography,
} from '@mui/material';
import { useId, useState, type FormEvent } from 'react';
import { getPasswordStrength } from '../../lib/onboarding-utils.js';

const fieldSx = {
  '& .MuiOutlinedInput-root': {
    '& fieldset': { borderColor: '#2a2a2e' },
    '&:hover fieldset': { borderColor: '#71717a' },
    '&.Mui-focused fieldset': { borderColor: '#e8ff47' },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: '#e8ff47' },
  '& .MuiInputBase-input': { color: '#f4f4f5' },
  '& .MuiInputLabel-root': { color: '#71717a' },
};

const strengthColor = {
  weak: '#ff4d4d',
  fair: '#d4a017',
  strong: '#2d6a4f',
};

type Props = {
  email: string;
  password: string;
  confirmPassword: string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onConfirmPasswordChange: (v: string) => void;
  onBack: () => void;
  onContinue: () => void;
};

export function SignupStepAccount({
  email,
  password,
  confirmPassword,
  onEmailChange,
  onPasswordChange,
  onConfirmPasswordChange,
  onBack,
  onContinue,
}: Props) {
  const headingId = useId();
  const [showPassword, setShowPassword] = useState(false);
  const strength = getPasswordStrength(password);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0;
  const canContinue = emailValid && password.length >= 8 && passwordsMatch;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    onContinue();
  }

  return (
    <Box component="form" onSubmit={onSubmit} aria-labelledby={headingId}>
      <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
        Your account
      </Typography>
      <TextField
        fullWidth
        label="Email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
        margin="normal"
        required
        autoFocus
        sx={fieldSx}
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
        sx={fieldSx}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((s) => !s)}
                edge="end"
                sx={{ color: '#71717a' }}
              >
                {showPassword ? '🙈' : '👁'}
              </IconButton>
            </InputAdornment>
          ),
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
              bgcolor: '#2a2a2e',
              '& .MuiLinearProgress-bar': { bgcolor: strengthColor[strength] },
            }}
          />
          <Typography variant="caption" sx={{ color: strengthColor[strength], mt: 0.5, display: 'block' }}>
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
        error={confirmPassword.length > 0 && !passwordsMatch}
        helperText={
          confirmPassword.length > 0 && !passwordsMatch ? 'Passwords do not match' : ' '
        }
        sx={fieldSx}
      />
      <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
        <Button variant="outlined" onClick={onBack} sx={{ flex: 1, borderColor: '#2a2a2e', color: '#f4f4f5' }}>
          Back
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={!canContinue}
          sx={{
            flex: 2,
            bgcolor: '#e8ff47',
            color: '#0a0a0b',
            fontWeight: 700,
            '&:hover': { bgcolor: '#d4eb3a' },
            '&.Mui-disabled': { bgcolor: '#2a2a2e', color: '#71717a' },
          }}
        >
          Continue
        </Button>
      </Box>
    </Box>
  );
}
