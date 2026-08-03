import {
  Alert,
  Box,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandShell } from '../components/BrandShell.js';
import { useAuth } from '../context/AuthContext.js';
import {
  getSquareConnectStatus,
  importPosMenu,
  type SquareConnectStatus,
} from '../lib/admin-api.js';

type Phase = 'loading' | 'importing' | 'picker' | 'error';

/**
 * Square OAuth return handler — auto-imports when there is at most one location.
 * Multi-location cafés see a picker; there is no separate "authorise" interstitial.
 */
export function OnboardingPosImportPage() {
  const navigate = useNavigate();
  const { session, refreshOnboardingStatus } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [status, setStatus] = useState<SquareConnectStatus | null>(null);
  const [locationId, setLocationId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const autoImportStarted = useRef(false);

  const runImport = useCallback(
    async (locId: string | null) => {
      if (!session) return;
      setError(null);
      setPhase('importing');
      try {
        await importPosMenu(session.token, {
          provider: 'square',
          locationId: locId,
        });
        await refreshOnboardingStatus();
        navigate('/onboarding', { replace: true });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Menu import failed');
        setPhase('picker');
      }
    },
    [session, refreshOnboardingStatus, navigate],
  );

  const loadStatus = useCallback(async () => {
    if (!session) return;
    setError(null);
    setPhase('loading');
    try {
      const data = await getSquareConnectStatus(session.token);
      setStatus(data);

      if (!data.connected) {
        setError('Square is not connected yet. Go back and try again.');
        setPhase('error');
        return;
      }

      const locations = data.locations ?? [];
      const preferred = data.locationId || locations[0]?.id || '';
      setLocationId(preferred);

      // Zero or one location → import immediately; several → show picker.
      if (locations.length <= 1) {
        if (!autoImportStarted.current) {
          autoImportStarted.current = true;
          await runImport(preferred || null);
        }
      } else {
        setPhase('picker');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Square status');
      setPhase('error');
    }
  }, [session, runImport]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('squareConnect');
    if (outcome === 'error') {
      const reason = params.get('reason') ?? 'unknown';
      setError(`Square connection failed (${reason}). Try again.`);
      setPhase('error');
    }
    if (params.has('squareConnect')) {
      params.delete('squareConnect');
      params.delete('reason');
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
    if (outcome !== 'error') {
      void loadStatus();
    }
  }, [loadStatus]);

  if (!session) return null;

  return (
    <BrandShell
      title="Connect Square"
      subtitle={`Import the live catalogue for ${session.cafe.name}`}
      maxWidth={640}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {(phase === 'loading' || phase === 'importing') && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={28} sx={{ mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            {phase === 'importing' ? 'Pulling your Square catalogue…' : 'Checking Square…'}
          </Typography>
        </Box>
      )}

      {phase === 'picker' && status && (
        <>
          <Typography variant="h6" gutterBottom>
            Choose a location
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            You have more than one Square location. Pick which catalogue to import.
          </Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="square-location-label">Location</InputLabel>
            <Select
              labelId="square-location-label"
              label="Location"
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
            >
              {status.locations.map((loc) => (
                <MenuItem key={loc.id} value={loc.id}>
                  {loc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            fullWidth
            size="large"
            disabled={!locationId}
            onClick={() => void runImport(locationId)}
          >
            Import menu from Square
          </Button>
        </>
      )}

      {phase === 'error' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button variant="contained" fullWidth onClick={() => void loadStatus()}>
            Retry
          </Button>
          <Button variant="outlined" fullWidth onClick={() => navigate('/onboarding')}>
            Back to menu setup
          </Button>
        </Box>
      )}

      {phase === 'picker' && (
        <Button variant="text" sx={{ mt: 2 }} fullWidth onClick={() => navigate('/onboarding')}>
          Back to menu setup
        </Button>
      )}
    </BrandShell>
  );
}
