import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

type Props = {
  open: boolean;
  busy: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function DisconnectSquareDialog({ open, busy, onClose, onConfirm }: Props) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Disconnect Square?</DialogTitle>
      <DialogContent>
        <Typography>
          Your menu will stop updating from Square. Your items and prices stay exactly as they are
          now, and you&apos;ll be able to edit them here instead.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm} disabled={busy}>
          {busy ? 'Disconnecting…' : 'Disconnect Square'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
