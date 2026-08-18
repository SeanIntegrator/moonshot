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
      description="Open this on the tablet by the machine."
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <ReadOnlyPanel source="generated" helper="These can't be changed.">
        <CopyText value={kdsUrl} aria-label="Copy kitchen display link" />
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 1.5 }}>
          <Typography variant="body2">
            Café:{' '}
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {cafe.slug}
            </Box>
          </Typography>
          <Typography variant="body2">
            User:{' '}
            <Box component="span" sx={{ fontWeight: 700, color: 'text.primary' }}>
              {KDS_USERNAME}
            </Box>
          </Typography>
        </Box>
      </ReadOnlyPanel>
      {password ? (
        <Box sx={{ mt: 2 }}>
          <ReadOnlyPanel helper="Copy this now. It won't be shown again.">
            <Typography variant="body2">New password</Typography>
            <CopyText value={password} aria-label="Copy kitchen password" />
          </ReadOnlyPanel>
        </Box>
      ) : null}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          pt: 2,
          mt: 2,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        <Button variant="outlined" onClick={() => void rotate()} disabled={busy}>
          {busy ? 'Generating…' : 'New kitchen password'}
        </Button>
      </Box>
    </SettingsCard>
  );
}
