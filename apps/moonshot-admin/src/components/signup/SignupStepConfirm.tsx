import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { useId, type FormEvent } from 'react';
import { getOrderAheadBaseUrl } from '../../lib/onboarding-utils.js';

const primaryButtonSx = {
  bgcolor: '#e8ff47',
  color: '#0a0a0b',
  fontWeight: 700,
  '&:hover': { bgcolor: '#d4eb3a' },
  '&.Mui-disabled': {
    bgcolor: '#3f3f46',
    color: '#a1a1aa',
  },
};

type Props = {
  cafeName: string;
  cafeSlug: string;
  email: string;
  submitting: boolean;
  error: string | null;
  success: boolean;
  onBack: () => void;
  onSubmit: () => void;
};

export function SignupStepConfirm({
  cafeName,
  cafeSlug,
  email,
  submitting,
  error,
  success,
  onBack,
  onSubmit,
}: Props) {
  const headingId = useId();
  const orderUrl = `${getOrderAheadBaseUrl()}/${cafeSlug}`;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  if (success) {
    return (
      <Box sx={{ textAlign: 'center', py: 2 }} aria-live="polite">
        <Typography sx={{ fontSize: '3rem', mb: 2 }} aria-hidden>
          ✓
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Café created!
        </Typography>
        <Typography variant="body2" sx={{ color: '#71717a', mt: 1 }}>
          Setting up your workspace…
        </Typography>
        <CircularProgress size={24} sx={{ mt: 3, color: '#e8ff47' }} />
      </Box>
    );
  }

  return (
    <Box component="form" onSubmit={handleSubmit} aria-labelledby={headingId}>
      <Typography id={headingId} variant="h6" component="h2" sx={{ mb: 2, fontWeight: 600 }}>
        Review & create
      </Typography>
      <Box
        sx={{
          bgcolor: '#0a0a0b',
          border: '1px solid #2a2a2e',
          borderRadius: 1,
          p: 2,
          mb: 2,
          fontFamily: 'monospace',
          fontSize: '0.875rem',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
          <Typography component="span" sx={{ color: '#71717a' }}>
            Café
          </Typography>
          <Typography component="span">{cafeName}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, gap: 2 }}>
          <Typography component="span" sx={{ color: '#71717a', flexShrink: 0 }}>
            Your URL
          </Typography>
          <Typography component="span" sx={{ wordBreak: 'break-all', textAlign: 'right' }}>
            {orderUrl}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
          <Typography component="span" sx={{ color: '#71717a' }}>
            Admin
          </Typography>
          <Typography component="span">{email}</Typography>
        </Box>
      </Box>
      <Typography variant="body2" sx={{ color: '#71717a', mb: 2 }}>
        By creating an account, you&apos;re provisioning a live café workspace. You can add menu
        items and go live in the next few minutes.
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          disabled={submitting}
          sx={{ flex: 1, borderColor: '#2a2a2e', color: '#f4f4f5' }}
        >
          Back
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
          sx={{ flex: 2, ...primaryButtonSx }}
        >
          {submitting ? (
            <>
              <CircularProgress size={18} sx={{ color: '#0a0a0b', mr: 1 }} />
              Creating…
            </>
          ) : (
            'Create my café'
          )}
        </Button>
      </Box>
    </Box>
  );
}
