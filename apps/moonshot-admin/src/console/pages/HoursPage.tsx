import { Box } from '@mui/material';
import { PageHeader } from '../primitives/PageHeader.js';
import { HoursSidebar } from './hours/HoursSidebar.js';
import { WeeklyHoursCard } from './hours/WeeklyHoursCard.js';

export function HoursPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader
        title="Opening hours"
        description="Customers can only order ahead while you're open."
      />
      <Box
        sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'flex-start',
          gap: 2.5,
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
          <WeeklyHoursCard />
        </Box>
        <HoursSidebar />
      </Box>
    </Box>
  );
}
