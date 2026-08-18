import { Box, Button, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { canSubmitSaveFooter, canUndoSaveFooter } from './save-footer.js';

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
  /** Compact cluster for page headers (no top rule). Unsaved sits left of Save. */
  variant?: 'footer' | 'inline';
};

function UnsavedMarker() {
  return (
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
  );
}

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
  variant = 'footer',
}: Props) {
  const enabled = canSubmitSaveFooter({ dirty, valid, saving });
  const unsaved = showUnsaved && dirty ? <UnsavedMarker /> : null;
  const secondary =
    secondaryLabel && onSecondary ? (
      <Button
        variant={secondaryVariant}
        onClick={onSecondary}
        disabled={!canUndoSaveFooter({ dirty, saving })}
      >
        {secondaryLabel}
      </Button>
    ) : null;
  const save = (
    <Button variant="contained" onClick={onSave} disabled={!enabled}>
      {saving ? 'Saving…' : label}
    </Button>
  );

  if (variant === 'inline') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
        {secondary}
        {unsaved}
        {save}
      </Box>
    );
  }

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
        {unsaved}
      </Box>
      {secondary}
      {save}
    </Box>
  );
}
