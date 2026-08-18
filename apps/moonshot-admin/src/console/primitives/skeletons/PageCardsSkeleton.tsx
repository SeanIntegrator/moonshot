import { Box } from '@mui/material';
import { CardSkeleton } from './CardSkeleton.js';

type Props = {
  cards?: number;
  columns?: 1 | 2;
  lines?: number;
};

/** Grid of SettingsCard skeletons matching Hours / Kitchen / Brand / Order-ahead. */
export function PageCardsSkeleton({ cards = 2, columns = 1, lines = 4 }: Props) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2.5,
        gridTemplateColumns: columns === 2 ? { xs: '1fr', md: '1fr 1fr' } : '1fr',
        alignItems: 'start',
      }}
    >
      {Array.from({ length: cards }, (_, i) => (
        <CardSkeleton key={i} lines={lines} />
      ))}
    </Box>
  );
}
