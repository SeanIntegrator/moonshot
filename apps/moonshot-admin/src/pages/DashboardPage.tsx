import type { Cafe } from '@moonshot/types';
import { Alert, Box, Button, CircularProgress, Stack } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import { KdsSettingsCard } from '../components/KdsSettingsCard.js';
import { MenuEditorCard } from '../components/MenuEditorCard.js';
import { OrderAheadSettingsCard } from '../components/OrderAheadSettingsCard.js';
import type { AdminSession } from '../context/AuthContext.js';
import { fetchPublicCafe } from '../lib/admin-api.js';

type Props = {
  session: AdminSession;
};

export function DashboardPage({ session }: Props) {
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    fetchPublicCafe(session.cafe.slug)
      .then((d) => setCafe(d.cafe))
      .catch((e) => {
        setCafe(null);
        setError(e instanceof Error ? e.message : 'Failed to load café');
      });
  }, [session.cafe.slug]);

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => load()}>
            Retry
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (!cafe) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      <OrderAheadSettingsCard cafe={cafe} token={session.token} onCafeUpdated={setCafe} />
      <MenuEditorCard cafeSlug={session.cafe.slug} token={session.token} />
      <KdsSettingsCard cafe={cafe} token={session.token} onCafeUpdated={setCafe} />
    </Stack>
  );
}
