import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StripePaymentsCard } from '../components/StripePaymentsCard.js';
import { useAuth } from '../context/AuthContext.js';
import {
  adminCompleteOnboarding,
  adminCreateKdsUser,
  createMenuItem,
} from '../lib/admin-api.js';
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
  const [menuName, setMenuName] = useState('Flat White');
  const [menuPrice, setMenuPrice] = useState('3.50');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    sessionStorage.setItem(stepStorageKey(session.cafe.id), String(step));
  }, [step, session]);

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

  const saveMenu = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const price = Math.round(parseFloat(menuPrice) * 100);
      if (!Number.isFinite(price) || price < 1) {
        throw new Error('Enter a valid price');
      }
      await createMenuItem(session!.token, session!.cafe.slug, {
        name: menuName.trim(),
        category: 'hot_drinks',
        priceMinor: price,
        description: '',
      });
      await refreshOnboardingStatus();
      setStep(3);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add menu item');
    } finally {
      setBusy(false);
    }
  }, [session, menuName, menuPrice, refreshOnboardingStatus]);

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
              Your café workspace is ready. Next: kitchen login, your first menu item, and optional
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

        {step === 2 && (
          <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3, boxShadow: 1 }}>
            <Typography variant="h6" gutterBottom>
              First menu item
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Add at least one item so customers can place an order. You can add more from the
              dashboard later.
            </Typography>
            <TextField
              fullWidth
              label="Item name"
              value={menuName}
              onChange={(e) => setMenuName(e.target.value)}
              margin="normal"
              sx={fieldSx}
            />
            <TextField
              fullWidth
              label="Price (£)"
              value={menuPrice}
              onChange={(e) => setMenuPrice(e.target.value)}
              margin="normal"
              sx={fieldSx}
            />
            <FormControl fullWidth margin="normal" sx={fieldSx}>
              <InputLabel>Category</InputLabel>
              <Select value="hot_drinks" label="Category" disabled>
                <MenuItem value="hot_drinks">Hot drinks</MenuItem>
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <Button variant="outlined" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button
                variant="contained"
                fullWidth
                disabled={busy || !menuName.trim()}
                onClick={() => void saveMenu()}
              >
                {busy ? <CircularProgress size={22} /> : 'Add item & continue'}
              </Button>
            </Box>
          </Box>
        )}

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
