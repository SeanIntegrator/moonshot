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
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import {
  getSquareConnectStatus,
  importPosMenu,
  startSquareConnect,
  type SquareConnectStatus,
} from '../lib/admin-api.js';

type Phase = 'loading' | 'connect' | 'ready' | 'importing' | 'done' | 'error';

export function OnboardingPosImportPage() {
  const navigate = useNavigate();
  const { session, refreshOnboardingStatus } = useAuth();
  const [phase, setPhase] = useState<Phase>('loading');
  const [status, setStatus] = useState<SquareConnectStatus | null>(null);
  const [locationId, setLocationId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [itemCount, setItemCount] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    if (!session) return;
    setError(null);
    try {
      const data = await getSquareConnectStatus(session.token);
      setStatus(data);
      const firstLocationId = data.locations?.[0]?.id;
      if (data.locationId) setLocationId(data.locationId);
      else if (firstLocationId) setLocationId(firstLocationId);
      setPhase(data.connected ? 'ready' : 'connect');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Square status');
      setPhase('error');
    }
  }, [session]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get('squareConnect');
    if (outcome === 'connected') {
      setNotice('Square connected — pick a location and import your menu.');
    } else if (outcome === 'error') {
      const reason = params.get('reason') ?? 'unknown';
      setError(`Square connection failed (${reason}). Try again.`);
    }
    if (params.has('squareConnect')) {
      params.delete('squareConnect');
      params.delete('reason');
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
    void loadStatus();
  }, [loadStatus]);

  const connect = useCallback(async () => {
    if (!session) return;
    setError(null);
    setPhase('loading');
    try {
      const { url } = await startSquareConnect(session.token);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Square connect');
      setPhase('connect');
    }
  }, [session]);

  const runImport = useCallback(async () => {
    if (!session) return;
    setError(null);
    setPhase('importing');
    try {
      const result = await importPosMenu(session.token, {
        provider: 'square',
        locationId: locationId || null,
      });
      setItemCount(result.itemCount);
      await refreshOnboardingStatus();
      setPhase('done');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Menu import failed');
      setPhase('ready');
    }
  }, [session, locationId, refreshOnboardingStatus]);

  if (!session) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
      <Box sx={{ maxWidth: 640, mx: 'auto', px: 2 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, mb: 1 }}
        >
          Connect Square
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Import the live catalogue for {session.cafe.name}
        </Typography>

        {notice && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setNotice(null)}>
            {notice}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3, boxShadow: 1 }}>
          {phase === 'loading' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={28} />
            </Box>
          )}

          {phase === 'connect' && (
            <>
              <Typography variant="h6" gutterBottom>
                Authorise Square
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                We&apos;ll open Square so you can grant Moonshot access to your Item Library. Your
                milks, syrups, and item prices come from Square; we add kitchen prep options
                (shots, beans, milk temp) on top.
              </Typography>
              <Button variant="contained" fullWidth size="large" onClick={() => void connect()}>
                Connect with Square
              </Button>
            </>
          )}

          {phase === 'ready' && status && (
            <>
              <Typography variant="h6" gutterBottom>
                Import menu
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Connected
                {status.merchantId ? ` (merchant ${status.merchantId.slice(0, 8)}…)` : ''}. Choose
                the Square location whose catalogue you want to import.
              </Typography>
              {status.locations.length > 0 ? (
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
              ) : (
                <Alert severity="info" sx={{ mb: 2 }}>
                  No active locations returned — import will use the default catalogue.
                </Alert>
              )}
              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={!locationId && status.locations.length > 0}
                onClick={() => void runImport()}
              >
                Import menu from Square
              </Button>
            </>
          )}

          {phase === 'importing' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Pulling your Square catalogue…
              </Typography>
            </Box>
          )}

          {phase === 'done' && (
            <>
              <Typography variant="h6" gutterBottom>
                Menu imported
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {itemCount ?? 0} item{(itemCount ?? 0) === 1 ? '' : 's'} pulled from Square. You can
                tweak them anytime from the dashboard.
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => navigate('/onboarding', { replace: true })}
              >
                Continue setup
              </Button>
            </>
          )}

          {phase === 'error' && (
            <Button variant="contained" fullWidth onClick={() => void loadStatus()}>
              Retry
            </Button>
          )}

          {phase !== 'done' && phase !== 'importing' && (
            <Button
              variant="text"
              sx={{ mt: 2 }}
              fullWidth
              onClick={() => navigate('/onboarding')}
            >
              Back to menu setup
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
}
