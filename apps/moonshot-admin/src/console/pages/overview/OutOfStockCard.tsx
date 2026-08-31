import { Box, Typography } from '@mui/material';
import type { AdminStockResponse } from '@moonshot/types';
import { useEffect, useMemo, useState } from 'react';
import { fetchAdminStock } from '../../../lib/admin-api.js';
import { DeepLinkFooter } from '../../primitives/DeepLinkFooter.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { CardSkeleton } from '../../primitives/skeletons/CardSkeleton.js';
import { StateChip } from '../../primitives/StateChip.js';
import { useToast } from '../../primitives/ToastProvider.js';
import { outOfStockSections, type OutOfStockItem } from './out-of-stock.js';

type Props = {
  token: string;
};

function sectionHeader(title: string) {
  return (
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.06em',
        color: 'text.secondary',
        textTransform: 'uppercase',
        px: { xs: 2, sm: 3 },
        pt: 1.5,
        pb: 0.75,
      }}
    >
      {title}
    </Typography>
  );
}

function OutOfStockRow({
  item,
  showDivider,
}: {
  item: OutOfStockItem;
  showDivider: boolean;
}) {
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: { xs: 2, sm: 3 },
        py: 1.25,
        borderBottom: showDivider ? `1px solid ${theme.console.hairline}` : 'none',
      })}
    >
      <Typography sx={{ fontWeight: 600 }}>{item.name}</Typography>
      <StateChip tone={item.chipTone}>{item.chipLabel}</StateChip>
    </Box>
  );
}

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

  const sections = useMemo(() => (stock ? outOfStockSections(stock) : []), [stock]);
  const empty = stock != null && sections.length === 0;

  // Flatten with last-item flag so hairlines stop before the footer without mutating during render.
  const rows = useMemo(() => {
    const items = sections.flatMap((section) =>
      section.items.map((item) => ({ sectionKey: section.key, sectionTitle: section.title, item })),
    );
    return items.map((row, index) => ({
      ...row,
      showDivider: index < items.length - 1,
      isSectionStart: index === 0 || items[index - 1]!.sectionKey !== row.sectionKey,
    }));
  }, [sections]);

  if (stock == null && !failed) {
    return <CardSkeleton lines={3} />;
  }

  return (
    <SettingsCard title="Out of stock">
      {empty ? (
        <Typography sx={{ mb: 2 }}>Nothing is marked out.</Typography>
      ) : (
        <Box
          sx={{
            mx: { xs: -2, sm: -3 },
            mb: 2,
            mt: 0.5,
          }}
        >
          {rows.map((row) => (
            <Box key={row.item.id}>
              {row.isSectionStart ? sectionHeader(row.sectionTitle) : null}
              <OutOfStockRow item={row.item} showDivider={row.showDivider} />
            </Box>
          ))}
        </Box>
      )}
      <DeepLinkFooter to="/stock">Manage stock</DeepLinkFooter>
    </SettingsCard>
  );
}
