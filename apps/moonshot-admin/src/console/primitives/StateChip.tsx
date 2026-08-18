import { Box } from '@mui/material';
import type { ReactNode } from 'react';

type Tone = 'amber' | 'red';

type Props = {
  tone: Tone;
  children: ReactNode;
};

export function StateChip({ tone, children }: Props) {
  return (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        lineHeight: 1.3,
        color: tone === 'amber' ? theme.console.stock.outToday : '#fff',
        bgcolor: tone === 'amber' ? 'rgba(217, 119, 6, 0.15)' : theme.console.stock.out,
      })}
    >
      {children}
    </Box>
  );
}
