import { Box, Button, Link } from '@mui/material';
import { StripePaymentsCard } from '../StripePaymentsCard.js';

type Props = {
  token: string;
  stripeReturnNotice: boolean;
  busy: boolean;
  onFinish: () => void;
};

/**
 * Payments step — Stripe Connect or skip to pay-in-store.
 * Both "Finish setup" and "Skip" complete onboarding and enter the dashboard.
 */
export function PaymentsStep({ token, stripeReturnNotice, busy, onFinish }: Props) {
  return (
    <Box>
      <StripePaymentsCard
        token={token}
        stripeReturnNotice={stripeReturnNotice}
        onChargesEnabled={onFinish}
      />
      <Button
        variant="contained"
        fullWidth
        size="large"
        sx={{ mt: 2 }}
        disabled={busy}
        onClick={onFinish}
      >
        {busy ? 'Finishing…' : 'Finish setup'}
      </Button>
      <Box sx={{ mt: 2, textAlign: 'center' }}>
        <Link
          component="button"
          type="button"
          variant="body2"
          onClick={onFinish}
          disabled={busy}
          sx={{ cursor: 'pointer' }}
        >
          Skip — take payments in store
        </Link>
      </Box>
    </Box>
  );
}
