import type { Cafe } from '@moonshot/types';
import {
  Alert,
  Box,
  Button,
  FormControlLabel,
  Paper,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { patchAdminSettings } from '../lib/admin-api.js';

type Props = {
  cafe: Cafe;
  token: string;
  onCafeUpdated: (c: Cafe) => void;
};

export function ReviewNudgeSettingsCard({ cafe, token, onCafeUpdated }: Props) {
  const nudge = cafe.features.review_nudge;

  const [enabled, setEnabled] = useState(Boolean(nudge?.enabled));
  const [reviewUrl, setReviewUrl] = useState(nudge?.reviewUrl ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    setEnabled(Boolean(nudge?.enabled));
    setReviewUrl(nudge?.reviewUrl ?? '');
  }, [nudge]);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const trimmed = reviewUrl.trim();
      const data = await patchAdminSettings(token, {
        featuresPatch: {
          review_nudge: enabled
            ? { enabled: true, reviewUrl: trimmed.length > 0 ? trimmed : null }
            : null,
        },
      });
      onCafeUpdated(data.cafe);
      setMessage({ type: 'ok', text: 'Review nudge settings saved.' });
    } catch (e) {
      setMessage({ type: 'err', text: e instanceof Error ? e.message : 'Save failed' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h6" gutterBottom>
        Review nudge
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        After three on-time app orders, signed-in customers see a one-time “Rate us” prompt that
        opens this URL.
      </Typography>
      {message && (
        <Alert
          severity={message.type === 'ok' ? 'success' : 'error'}
          sx={{ mb: 2 }}
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}
      <Stack spacing={2}>
        <FormControlLabel
          control={<Switch checked={enabled} onChange={(_, v) => setEnabled(v)} disabled={saving} />}
          label="Show review prompt after 3 on-time orders"
        />
        <TextField
          label="Review URL"
          size="small"
          fullWidth
          value={reviewUrl}
          onChange={(e) => setReviewUrl(e.target.value)}
          disabled={!enabled || saving}
          placeholder="https://g.page/r/…"
          helperText="Google, TripAdvisor, or any https review link"
        />
        <Box>
          <Button variant="contained" size="small" onClick={() => void save()} disabled={saving}>
            Save review nudge
          </Button>
        </Box>
      </Stack>
    </Paper>
  );
}
