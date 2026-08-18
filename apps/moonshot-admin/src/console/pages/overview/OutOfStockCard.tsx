import { Box, Typography } from '@mui/material';
import type { AdminStockResponse } from '@moonshot/types';
import { useEffect, useState } from 'react';
import { fetchAdminStock } from '../../../lib/admin-api.js';
import { DeepLinkFooter } from '../../primitives/DeepLinkFooter.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { CardSkeleton } from '../../primitives/skeletons/CardSkeleton.js';
import { StateChip } from '../../primitives/StateChip.js';
import { useToast } from '../../primitives/ToastProvider.js';

type Props = {
  token: string;
};

export function OutOfStockCard({ token }: Props) {
  const toast = useToast();
  const [stock, setStock] = useState<AdminStockResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
    fetchAdminStock(token)
      .then(setStock)
      .catch((e) => {
        setFailed(true);
        toast({
          severity: 'error',
          message: e instanceof Error ? e.message : 'Failed to load stock',
        });
      });
  }, [token, toast]);

  const outOptions = (stock?.options ?? []).filter((row) => row.availability !== 'in');
  const outFood = (stock?.food ?? []).filter((row) => row.availability === 'out');
  const empty = stock != null && outOptions.length === 0 && outFood.length === 0;

  if (stock == null && !failed) {
    return <CardSkeleton lines={3} />;
  }

  return (
    <SettingsCard title="Out of stock">
      {empty ? (
        <Typography sx={{ mb: 2 }}>Nothing is marked out.</Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
          {outOptions.map((row) => (
            <Box
              key={row.optionId}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
            >
              <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
              <StateChip tone={row.availability === 'out_today' ? 'amber' : 'red'}>
                {row.availability === 'out_today' ? 'Out today' : 'Out'}
              </StateChip>
            </Box>
          ))}
          {outFood.map((row) => (
            <Box
              key={row.itemId}
              sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
            >
              <Typography sx={{ fontWeight: 600 }}>{row.name}</Typography>
              <StateChip tone="red">Off the menu</StateChip>
            </Box>
          ))}
        </Box>
      )}
      <DeepLinkFooter to="/stock">Manage stock</DeepLinkFooter>
    </SettingsCard>
  );
}
