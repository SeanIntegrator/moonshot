import { Box, Typography } from '@mui/material';
import { useCafe } from '../../CafeProvider.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { resolveServiceStatus } from '../../service-status.js';

/**
 * Date overrides and pause are not in café settings yet. Status is hours-derived
 * only — no Pause control and no “+ Add a date”.
 */
export function HoursSidebar() {
  const { cafe, openStatus } = useCafe();
  const status = resolveServiceStatus({
    isOpen: openStatus.isOpen,
    timeZone: cafe.timezone,
  });
  const taking = status.kind === 'taking_orders';

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, width: { xs: '100%', md: 300 } }}>
      <SettingsCard title="One-off changes">
        <Typography variant="body2">
          Bank holidays and one-off hours aren’t available yet.
        </Typography>
      </SettingsCard>
      <SettingsCard title="Right now">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box
            sx={(theme) => ({
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: taking ? theme.console.status.takingOrders : theme.console.status.closed,
            })}
          />
          <Typography sx={{ fontWeight: 700 }}>{status.label}</Typography>
        </Box>
        <Typography variant="body2">{openStatus.caption}</Typography>
      </SettingsCard>
    </Box>
  );
}
