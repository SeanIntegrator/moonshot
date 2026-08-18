import { DeepLinkFooter } from '../../primitives/DeepLinkFooter.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { Typography } from '@mui/material';
import type { CafeHours, CafeHoursOverride } from '@moonshot/types';
import { todayHoursLine } from './today-hours.js';

type Props = {
  hours: CafeHours;
  timeZone: string;
  hoursOverrides?: CafeHoursOverride[];
};

export function HoursSummaryCard({ hours, timeZone, hoursOverrides }: Props) {
  return (
    <SettingsCard title="Today's hours">
      <Typography sx={{ fontWeight: 600, mb: 2 }}>
        {todayHoursLine(hours, timeZone, new Date(), hoursOverrides)}
      </Typography>
      <DeepLinkFooter to="/hours">Edit hours</DeepLinkFooter>
    </SettingsCard>
  );
}
