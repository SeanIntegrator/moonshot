import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { canSubmitSaveFooter } from './save-footer.js';

type Props = {
  label: string;
  dirty: boolean;
  valid?: boolean;
  saving?: boolean;
  onSave: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryVariant?: 'text' | 'outlined';
  /** Left of the unsaved label — e.g. “+ Add an option”. */
  start?: ReactNode;
  showUnsaved?: boolean;
};

export function SaveFooter({
  label,
  dirty,
  valid = true,
  saving = false,
  onSave,
  secondaryLabel,
  onSecondary,
  secondaryVariant = 'text',
  start,
  showUnsaved = true,
}: Props) {
  const enabled = canSubmitSaveFooter({ dirty, valid, saving });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexWrap: 'wrap',
        gap: 2,
        pt: 2,
        mt: 2,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ mr: 'auto', display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        {start}
        {showUnsaved && dirty ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box
              sx={(theme) => ({
                width: 6,
                height: 6,
                borderRadius: '50%',
                bgcolor: theme.console.ink,
              })}
            />
            <Typography variant="caption" sx={{ color: 'text.primary' }}>
              Unsaved changes
            </Typography>
          </Box>
        ) : null}
      </Box>
      {secondaryLabel && onSecondary ? (
        <Button variant={secondaryVariant} onClick={onSecondary} disabled={saving}>
          {secondaryLabel}
        </Button>
      ) : null}
      <Button variant="contained" onClick={onSave} disabled={!enabled}>
        {saving ? 'Saving…' : label}
      </Button>
    </Box>
  );
}
