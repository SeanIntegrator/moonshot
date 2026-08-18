import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { Box, Typography } from '@mui/material';

export type SourceKind = 'square' | 'stripe' | 'generated';

const LABELS: Record<SourceKind, string> = {
  square: 'From Square',
  stripe: 'From Stripe',
  generated: 'Generated for you',
};

export function SourceLabel({ kind }: { kind: SourceKind }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <LockOutlinedIcon sx={{ fontSize: 12, color: 'text.secondary' }} />
      <Typography
        component="span"
        sx={{ fontSize: 12, color: 'text.secondary', lineHeight: 1 }}
      >
        {LABELS[kind]}
      </Typography>
    </Box>
  );
}
