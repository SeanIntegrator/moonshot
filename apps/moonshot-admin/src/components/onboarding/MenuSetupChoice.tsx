import { Alert, Box, Button, CircularProgress, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import { startSquareConnect } from '../../lib/admin-api.js';

type Props = {
  token: string;
  onEditTemplate: () => void;
};

export function MenuSetupChoice({ token, onEditTemplate }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectSquare = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      // Jump straight to Square OAuth — no interstitial authorise page.
      const { url } = await startSquareConnect(token);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Square connect');
      setBusy(false);
    }
  }, [token]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Set up your menu
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Connect Square to pull your live catalogue, or start from our café template. Square supplies
        prices, milks, and syrups; we add kitchen prep options (shots, beans, milk temp) on top. You
        can always edit items later in the dashboard.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={busy}
          onClick={() => void connectSquare()}
          sx={{ py: 1.5 }}
        >
          {busy ? <CircularProgress size={22} color="inherit" /> : 'Connect my menu with Square'}
        </Button>
        <Button
          variant="outlined"
          size="large"
          fullWidth
          disabled={busy}
          onClick={onEditTemplate}
          sx={{ py: 1.5 }}
        >
          Continue with template
        </Button>
      </Box>
    </Box>
  );
}
