import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import type { StockAvailability } from '../../primitives/StockControl.js';

type Props = {
  name: string;
  meta: string;
  availability: StockAvailability;
  initials: string;
  colorHex?: string | null;
  control: ReactNode;
};

export function StockOptionRow({ name, meta, availability, initials, colorHex, control }: Props) {
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: { xs: 2, sm: 3 },
        py: 2.25,
        bgcolor:
          availability === 'out_today'
            ? theme.console.stock.outTodayRow
            : availability === 'out'
              ? theme.console.stock.outRow
              : 'transparent',
      })}
    >
      <Box
        sx={(theme) => ({
          flex: '0 0 auto',
          width: 32,
          height: 32,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          bgcolor: colorHex || theme.console.stock.avatarFill,
          color: theme.console.ink,
        })}
      >
        {initials}
      </Box>
      <Box sx={{ minWidth: 0, flex: '1 1 160px' }}>
        <Typography sx={{ fontWeight: 600 }}>{name}</Typography>
        <Typography
          variant="body2"
          sx={(theme) => ({
            color:
              availability === 'out_today'
                ? theme.console.stock.outTodayMeta
                : availability === 'out'
                  ? theme.console.stock.outMeta
                  : theme.console.muted,
          })}
        >
          {meta}
        </Typography>
      </Box>
      <Box
        sx={(theme) => ({
          alignSelf: 'stretch',
          width: '1px',
          bgcolor: theme.console.hairline,
          flex: '0 0 auto',
          display: { xs: 'none', sm: 'block' },
        })}
      />
      <Box sx={{ flex: '0 0 auto', ml: 'auto' }}>{control}</Box>
    </Box>
  );
}

export function StockRowList({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={(theme) => ({
        mx: { xs: -2, sm: -3 },
        mb: { xs: -2, sm: -3 },
        mt: 0.5,
        '& > *:not(:last-child)': {
          borderBottom: `1px solid ${theme.console.hairline}`,
        },
      })}
    >
      {children}
    </Box>
  );
}
