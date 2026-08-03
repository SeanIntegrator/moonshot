import { Alert, Link } from '@mui/material';
import { useCallback, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { BrandShell } from '../components/BrandShell.js';
import { SignupForm } from '../components/signup/SignupForm.js';
import { useAuth } from '../context/AuthContext.js';

export function SignupPage() {
  const navigate = useNavigate();
  const { register, apiConfigured } = useAuth();

  const [cafeName, setCafeName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRegister = useCallback(async () => {
    setError(null);
    setSubmitting(true);
    try {
      // Slug and timezone are derived server-side — keep the form non-technical.
      await register({
        cafeName: cafeName.trim(),
        email: email.trim(),
        password,
      });
      setSuccess(true);
      setTimeout(() => navigate('/onboarding', { replace: true }), 700);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }, [register, cafeName, email, password, navigate]);

  return (
    <BrandShell
      title="Create your café"
      subtitle="Get order-ahead, KDS, and admin in one workspace."
      footer={
        <>
          Already have an account?{' '}
          <Link component={RouterLink} to="/login" underline="hover">
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
      <SignupForm
        cafeName={cafeName}
        email={email}
        password={password}
        confirmPassword={confirmPassword}
        submitting={submitting}
        error={error}
        success={success}
        onCafeNameChange={setCafeName}
        onEmailChange={setEmail}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={() => void handleRegister()}
      />
    </BrandShell>
  );
}
