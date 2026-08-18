import { Button, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext.js';
import { getSquareConnectStatus } from '../../lib/admin-api.js';
import { PageHeader } from '../primitives/PageHeader.js';
import { SettingsCard } from '../primitives/SettingsCard.js';

const SQUARE_DASHBOARD = 'https://squareup.com/dashboard';

export function ReportsPage() {
  const { session } = useAuth();
  const [squareConnected, setSquareConnected] = useState(false);

  useEffect(() => {
    if (!session) return;
    void getSquareConnectStatus(session.token)
      .then((s) => setSquareConnected(s.connected))
      .catch(() => setSquareConnected(false));
  }, [session]);

  return (
    <>
      <PageHeader
        title="Reports"
        description="You'll be able to see order-ahead takings, your busiest hours and your top sellers here."
        action={
          squareConnected ? (
            <Button
              variant="outlined"
              href={SQUARE_DASHBOARD}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Square ↗
            </Button>
          ) : undefined
        }
      />
      <SettingsCard title="Coming soon">
        <Typography>
          Reports are coming soon. Until then, Square has your in-store takings.
        </Typography>
      </SettingsCard>
    </>
  );
}
