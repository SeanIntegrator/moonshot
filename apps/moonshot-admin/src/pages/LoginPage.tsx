import {
  Alert,
  Box,
  Button,
  Link,
  TextField,
  Typography,
} from '@mui/material';
import { type FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { AuthShell } from '../components/AuthShell.js';
import { useAuth } from '../context/AuthContext.js';

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

export function LoginPage() {
  const { login, apiConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your café dashboard.">
      {!apiConfigured && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Set <code>VITE_API_URL</code> to your API origin (no <code>/api/v1</code> suffix).
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box component="form" onSubmit={onSubmit}>
        <TextField
          fullWidth
          label="Email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          margin="normal"
          required
          autoFocus
          disabled={!apiConfigured || submitting}
          sx={fieldSx}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          margin="normal"
          required
          disabled={!apiConfigured || submitting}
          sx={fieldSx}
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          sx={{
            mt: 3,
            bgcolor: '#e8ff47',
            color: '#0a0a0b',
            fontWeight: 700,
            '&:hover': { bgcolor: '#d4eb3a' },
          }}
          disabled={!apiConfigured || submitting}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <Typography variant="body2" sx={{ color: '#71717a', mt: 2, textAlign: 'center' }}>
          New here?{' '}
          <Link component={RouterLink} to="/signup" sx={{ color: '#e8ff47' }}>
            Create a café
          </Link>
        </Typography>
      </Box>
    </AuthShell>
  );
}
