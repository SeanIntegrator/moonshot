import { Alert, Box, Button, Typography } from '@mui/material';
import { useState } from 'react';
import { useAuth } from '../../../context/AuthContext.js';
import { useCafe } from '../../CafeProvider.js';
import { adminCreateKdsUser } from '../../../lib/admin-api.js';
import { getKdsBaseUrl } from '../../../lib/onboarding-utils.js';
import { CopyText } from '../../primitives/CopyText.js';
import { ReadOnlyPanel } from '../../primitives/ReadOnlyPanel.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';

const KDS_USERNAME = 'barista';

export function AccessCard() {
  const { cafe } = useCafe();
  const { session } = useAuth();
  const kdsUrl = getKdsBaseUrl();
  const [password, setPassword] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function rotate() {
    if (!session) return;
    setError(null);
    setBusy(true);
    setPassword(null);
    try {
      const result = await adminCreateKdsUser(session.token, { username: KDS_USERNAME });
      if (!result.password) {
        setError('Server did not return a password — try again');
        return;
      }
      setPassword(result.password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not generate kitchen password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <SettingsCard
      title="Kitchen access"
      description="Baristas sign in with the café slug and this username. Generate a new password anytime — the previous one stops working immediately."
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <ReadOnlyPanel source="generated" helper="These can't be changed.">
        <Typography variant="body2">Café slug</Typography>
        <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{cafe.slug}</Typography>
        <Typography variant="body2">Username</Typography>
        <Typography sx={{ fontWeight: 700, mb: 1.5 }}>{KDS_USERNAME}</Typography>
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          Kitchen display
        </Typography>
        <CopyText value={kdsUrl} aria-label="Copy kitchen display link" />
      </ReadOnlyPanel>
      {password ? (
        <Box sx={{ mt: 2 }}>
          <ReadOnlyPanel helper="Copy this now. It won't be shown again.">
            <Typography variant="body2">New password</Typography>
            <CopyText value={password} aria-label="Copy kitchen password" />
          </ReadOnlyPanel>
        </Box>
      ) : null}
      <Box sx={{ mt: 2 }}>
        <Button variant="outlined" onClick={() => void rotate()} disabled={busy}>
          {busy ? 'Generating…' : 'Generate new password'}
        </Button>
      </Box>
    </SettingsCard>
  );
}
