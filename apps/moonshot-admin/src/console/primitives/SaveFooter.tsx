import { Box, Button, Typography } from '@mui/material';
import { canSubmitSaveFooter } from './save-footer.js';

type Props = {
  label: string;
  dirty: boolean;
  valid?: boolean;
  saving?: boolean;
  onSave: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export function SaveFooter({
  label,
  dirty,
  valid = true,
  saving = false,
  onSave,
  secondaryLabel,
  onSecondary,
}: Props) {
  const enabled = canSubmitSaveFooter({ dirty, valid, saving });

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        pt: 2,
        mt: 2,
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <Box sx={{ mr: 'auto' }}>
        {dirty ? (
          <Typography variant="caption" sx={{ color: 'text.primary' }}>
            Unsaved changes
          </Typography>
        ) : null}
      </Box>
      {secondaryLabel && onSecondary ? (
        <Button variant="text" onClick={onSecondary} disabled={saving}>
          {secondaryLabel}
        </Button>
      ) : null}
      <Button variant="contained" onClick={onSave} disabled={!enabled}>
        {saving ? 'Saving…' : label}
      </Button>
    </Box>
  );
}
