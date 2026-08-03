import { Alert, Box, Button, Link, TextField } from '@mui/material';
import { type FormEvent, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { BrandShell } from '../components/BrandShell.js';
import { useAuth } from '../context/AuthContext.js';

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
    <BrandShell
      title="Welcome back"
      subtitle="Sign in to your café dashboard."
      footer={
        <>
          New here?{' '}
          <Link component={RouterLink} to="/signup" underline="hover">
            Create a café
          </Link>
        </>
      }
    >
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
        />
        <Button
          type="submit"
          variant="contained"
          fullWidth
          size="large"
          sx={{ mt: 3 }}
          disabled={!apiConfigured || submitting}
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Box>
    </BrandShell>
  );
}
