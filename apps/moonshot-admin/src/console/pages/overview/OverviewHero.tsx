import { Box, Typography } from '@mui/material';
import { formatUkDateHeading } from '../../../lib/format.js';
import { overviewHeroHeading } from './today-hours.js';
import type { CafeHours, CafeHoursOverride } from '@moonshot/types';
import { PauseControl } from '../../primitives/PauseControl.js';
import { useCafe } from '../../CafeProvider.js';
import { useToast } from '../../primitives/ToastProvider.js';
import { formatTime24 } from '../../../lib/format.js';

type Props = {
  hours: CafeHours;
  timeZone: string;
  pausedUntil?: string | null;
  lastOrderBufferMinutes?: number;
  hoursOverrides?: CafeHoursOverride[];
};

export function OverviewHero({
  hours,
  timeZone,
  pausedUntil,
  lastOrderBufferMinutes,
  hoursOverrides,
}: Props) {
  const { pauseOrders, resumeOrders, extendPause } = useCafe();
  const toast = useToast();
  const fail = (e: unknown) =>
    toast({
      severity: 'error',
      message: e instanceof Error ? e.message : 'Could not update pause',
    });
  const now = new Date();
  const { heading, sub } = overviewHeroHeading(hours, timeZone, now, {
    pausedUntil,
    lastOrderBufferMinutes,
    overrides: hoursOverrides,
  });
  const pausedUntilLabel =
    pausedUntil && new Date(pausedUntil).getTime() > now.getTime()
      ? formatTime24(new Date(pausedUntil), timeZone)
      : null;

  return (
    <Box
      sx={(theme) => ({
        bgcolor: theme.console.hero,
        color: '#fff',
        borderRadius: `${theme.console.card.radiusPx}px`,
        px: { xs: 2.5, sm: 3.5 },
        py: { xs: 2.5, sm: 3 },
        display: 'flex',
        alignItems: { xs: 'stretch', sm: 'center' },
        justifyContent: 'space-between',
        gap: 2,
        flexDirection: { xs: 'column', sm: 'row' },
      })}
    >
      <Box sx={{ minWidth: 0 }}>
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
        {sub ? (
          <Typography sx={{ mt: 1, color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
            {sub}
          </Typography>
        ) : null}
      </Box>
      <Box sx={{ flexShrink: 0 }}>
        <PauseControl
          pausedUntilLabel={pausedUntilLabel}
          onPause={(duration) => pauseOrders(duration).catch(fail)}
          onResume={() => resumeOrders().catch(fail)}
          onExtend15={() => extendPause().catch(fail)}
        />
      </Box>
    </Box>
  );
}
