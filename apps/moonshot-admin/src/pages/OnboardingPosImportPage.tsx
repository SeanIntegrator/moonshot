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
import { OnboardingShell } from '../components/onboarding/OnboardingShell.js';
import { useAuth } from '../context/AuthContext.js';
import {
  getSquareConnectStatus,
  importPosMenu,
  type SquareConnectStatus,
} from '../lib/admin-api.js';
import {
  hasSquareConnectQuery,
  squareConnectNoticeFromSearch,
  stripSquareConnectSearchParams,
} from '../lib/square-connect-errors.js';

type Phase = 'loading' | 'importing' | 'picker' | 'error';

/**
 * Square OAuth return — auto-imports when ≤1 location; multi-location shows a picker.
 * Stays on step 2 (Menu) of the four-step progress.
 */
export function OnboardingPosImportPage() {
  const navigate = useNavigate();
  const { session, refreshOnboardingStatus } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [status, setStatus] = useState<SquareConnectStatus | null>(null);
  const [locationId, setLocationId] = useState('');
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
        if (data.status === 'needs_reauth' || data.status === 'revoked') {
          setError(
            data.status === 'revoked'
              ? 'Square access was revoked. Go back and reconnect Square.'
              : 'Your Square login has expired. Go back and reconnect Square.',
          );
        } else {
          setError('Square is not connected yet. Go back and try again.');
        }
        setPhase('error');
        return;
      }

      const locations = data.locations ?? [];
      const preferred = data.locationId || locations[0]?.id || '';
      setLocationId(preferred);

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
    const notice = squareConnectNoticeFromSearch(window.location.search);
    if (notice?.severity === 'error') {
      setError(notice.message);
      setPhase('error');
    }
    if (hasSquareConnectQuery(window.location.search)) {
      const qs = stripSquareConnectSearchParams(window.location.search);
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
    if (outcome !== 'error') {
      void loadStatus();
    }
  }, [loadStatus]);

  if (!session) return null;

  return (
    <OnboardingShell
      title="Import from Square"
      subtitle={`Pulling the catalogue for ${session.cafe.name}`}
      activeStep={1}
      maxWidth={560}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {(phase === 'loading' || phase === 'importing') && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CircularProgress size={28} sx={{ mb: 2 }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {phase === 'importing' ? 'Importing your Square menu…' : 'Checking Square…'}
          </Typography>
        </Box>
      )}

      {phase === 'picker' && status ? (
        <>
          <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>
            Choose a location
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
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
            Import menu
          </Button>
          <Button variant="text" sx={{ mt: 1.5 }} fullWidth onClick={() => navigate('/onboarding')}>
            Back to menu setup
          </Button>
        </>
      ) : null}

      {phase === 'error' ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Button variant="contained" fullWidth onClick={() => void loadStatus()}>
            Retry
          </Button>
          <Button variant="outlined" fullWidth onClick={() => navigate('/onboarding')}>
            Back to menu setup
          </Button>
        </Box>
      ) : null}
    </OnboardingShell>
  );
}
