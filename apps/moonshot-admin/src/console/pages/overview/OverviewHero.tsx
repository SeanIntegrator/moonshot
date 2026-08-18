import { Box, Typography } from '@mui/material';
import { formatUkDateHeading } from '../../../lib/format.js';
import { overviewHeroHeading } from './today-hours.js';
import type { CafeHours } from '@moonshot/types';

type Props = {
  hours: CafeHours;
  timeZone: string;
};

export function OverviewHero({ hours, timeZone }: Props) {
  const now = new Date();
  const { heading } = overviewHeroHeading(hours, timeZone, now);

  return (
    <Box
      sx={(theme) => ({
        bgcolor: theme.console.hero,
        color: '#fff',
        borderRadius: `${theme.console.card.radiusPx}px`,
        px: { xs: 2.5, sm: 3.5 },
        py: { xs: 2.5, sm: 3 },
      })}
    >
      <Typography
        sx={{
          fontSize: 12,
          letterSpacing: '0.08em',
          fontWeight: 600,
          color: 'rgba(255,255,255,0.55)',
        }}
      >
        {formatUkDateHeading(now, timeZone)}
      </Typography>
      <Typography
        sx={{
          mt: 0.75,
          fontWeight: 700,
          fontSize: { xs: '1.5rem', sm: '1.75rem' },
          letterSpacing: '-0.02em',
          lineHeight: 1.2,
        }}
      >
        {heading}
      </Typography>
    </Box>
  );
}
