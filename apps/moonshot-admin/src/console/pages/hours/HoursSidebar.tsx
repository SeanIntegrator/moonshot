import { Box, Typography } from '@mui/material';
import { formatTime24 } from '../../../lib/format.js';
import { useCafe } from '../../CafeProvider.js';
import { PauseControl } from '../../primitives/PauseControl.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { useToast } from '../../primitives/ToastProvider.js';
import { resolveServiceStatus } from '../../service-status.js';
import { HoursOverridesCard } from './HoursOverridesCard.js';

export function HoursSidebar() {
  const { cafe, openStatus, pauseOrders, resumeOrders, extendPause } = useCafe();
  const toast = useToast();
  const fail = (e: unknown) =>
    toast({
      severity: 'error',
      message: e instanceof Error ? e.message : 'Could not update pause',
    });
  const status = resolveServiceStatus({
    isOpen: openStatus.isOpen,
    timeZone: cafe.timezone,
    pausedUntil: cafe.pausedUntil,
  });
  const taking = status.kind === 'taking_orders';
  const pausedUntilLabel =
    status.kind === 'paused' && cafe.pausedUntil
      ? formatTime24(new Date(cafe.pausedUntil), cafe.timezone)
      : null;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: { xs: '100%', md: 300 } }}>
      <HoursOverridesCard />
      <SettingsCard title="Right now">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={(theme) => ({
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor:
                status.kind === 'paused'
                  ? theme.console.status.paused
                  : taking
                    ? theme.console.status.takingOrders
                    : theme.console.status.closed,
            })}
          />
          <Typography sx={{ fontWeight: 700 }}>{status.label}</Typography>
        </Box>
        <Typography variant="body2" sx={{ mb: 1.5 }}>
          {openStatus.caption}
        </Typography>
        <PauseControl
          pausedUntilLabel={pausedUntilLabel}
          onPause={(duration) => pauseOrders(duration).catch(fail)}
          onResume={() => resumeOrders().catch(fail)}
          onExtend15={() => extendPause().catch(fail)}
        />
        {status.kind !== 'paused' ? (
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
            Use this when you&apos;re slammed. It doesn&apos;t change your hours.
          </Typography>
        ) : null}
      </SettingsCard>
    </Box>
  );
}
