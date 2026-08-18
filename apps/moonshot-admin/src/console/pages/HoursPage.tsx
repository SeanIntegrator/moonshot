import { Box } from '@mui/material';
import { PageHeader } from '../primitives/PageHeader.js';
import { WeeklyHoursCard } from './hours/WeeklyHoursCard.js';

export function HoursPage() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <PageHeader
        title="Opening hours"
        description="Customers can only order ahead while you're open."
      />
      <WeeklyHoursCard />
    </Box>
  );
}
