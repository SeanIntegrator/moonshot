import { Box, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { SourceLabel, type SourceKind } from './SourceLabel.js';

type Props = {
  source?: SourceKind;
  helper?: ReactNode;
  children: ReactNode;
};

/** Values the owner cannot edit — never an input-shaped control. */
export function ReadOnlyPanel({ source, helper, children }: Props) {
  return (
    <Box
      sx={(theme) => ({
        bgcolor: theme.console.readonly.fill,
        border: `1px solid ${theme.console.readonly.border}`,
        borderRadius: 1.5,
        px: 2,
        py: 1.5,
        cursor: 'default',
        '&:focus, &:focus-visible': { outline: 'none' },
      })}
    >
      {source ? (
        <Box sx={{ mb: 1.25 }}>
          <SourceLabel kind={source} />
        </Box>
      ) : null}
      {children}
      {helper ? (
        <Typography variant="caption" sx={{ display: 'block', mt: 1.25 }}>
          {helper}
        </Typography>
      ) : null}
    </Box>
  );
}
