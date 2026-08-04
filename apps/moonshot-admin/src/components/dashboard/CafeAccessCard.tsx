import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { adminCreateKdsUser } from '../../lib/admin-api.js';
import { getKdsBaseUrl, getOrderAheadBaseUrl } from '../../lib/onboarding-utils.js';

const DEFAULT_KDS_USERNAME = 'barista';

type Props = {
  token: string;
  cafeSlug: string;
  cafeName: string;
};

/**
 * Shareable order-ahead + KDS links, plus kitchen password rotate.
 * Replaces the old onboarding "Go live" step so credentials stay reachable.
 */
export function CafeAccessCard({ token, cafeSlug, cafeName }: Props) {
  const orderUrl = `${getOrderAheadBaseUrl()}/${cafeSlug}`;
  const kdsUrl = getKdsBaseUrl();
  const [copied, setCopied] = useState<string | null>(null);
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyText = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setError('Could not copy to clipboard');
    }
  }, []);

  const generatePassword = useCallback(async () => {
    setError(null);
    setBusy(true);
    setGeneratedPassword(null);
    try {
      // Omit password so the server generates one and returns it once.
      const result = await adminCreateKdsUser(token, { username: DEFAULT_KDS_USERNAME });
      if (!result.password) {
        setError('Server did not return a password — try again');
        return;
      }
      setGeneratedPassword(result.password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate kitchen password');
    } finally {
      setBusy(false);
    }
  }, [token]);

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Your café links
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 2
        }}>
        Share these with your team and customers. Baristas sign into the kitchen display with café
        slug <strong>{cafeSlug}</strong> and username <strong>{DEFAULT_KDS_USERNAME}</strong>.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Typography variant="subtitle2">Order-ahead</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField fullWidth size="small" value={orderUrl} slotProps={{
          input: { readOnly: true }
        }} />
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon fontSize="small" />}
          onClick={() => void copyText('order', orderUrl)}
        >
          {copied === 'order' ? 'Copied' : 'Copy'}
        </Button>
      </Box>

      <Typography variant="subtitle2">Kitchen display</Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
        <TextField fullWidth size="small" value={kdsUrl} slotProps={{
          input: { readOnly: true }
        }} />
        <Button
          variant="outlined"
          startIcon={<ContentCopyIcon fontSize="small" />}
          onClick={() => void copyText('kds', kdsUrl)}
        >
          {copied === 'kds' ? 'Copied' : 'Copy'}
        </Button>
      </Box>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2">Kitchen password</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          A kitchen login was created when you signed up {cafeName ? `for ${cafeName}` : ''}. Generate
          a new password anytime — the previous one stops working immediately.
        </Typography>
        {generatedPassword && (
          <Alert
            severity="success"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => void copyText('pw', generatedPassword)}
              >
                {copied === 'pw' ? 'Copied' : 'Copy'}
              </Button>
            }
          >
            New password: <strong style={{ fontFamily: 'monospace' }}>{generatedPassword}</strong>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.5
              }}>
              Copy it now — it won&apos;t be shown again.
            </Typography>
          </Alert>
        )}
        <Box>
          <Button variant="outlined" disabled={busy} onClick={() => void generatePassword()}>
            {busy ? <CircularProgress size={20} /> : 'Generate kitchen password'}
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
