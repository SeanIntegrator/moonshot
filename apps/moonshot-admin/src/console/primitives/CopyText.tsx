import { Box, Button, Typography } from '@mui/material';
import { useState } from 'react';

type Props = {
  value: string;
  'aria-label'?: string;
};

export function CopyText({ value, 'aria-label': ariaLabel }: Props) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0 }}>
      <Typography
        component="span"
        sx={{ fontWeight: 600, wordBreak: 'break-all' }}
      >
        {value}
      </Typography>
      <Button variant="outlined" size="small" onClick={() => void copy()} aria-label={ariaLabel ?? `Copy ${value}`}>
        {copied ? 'Copied' : 'Copy'}
      </Button>
    </Box>
  );
}
