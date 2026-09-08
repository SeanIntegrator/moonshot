import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';
import { buttonLoader } from '../../primitives/button-loader.js';

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
          Your menu will stop updating from Square. Items stay as they are, and you can
          edit names, prices, and options here instead.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={onConfirm}
          disabled={busy}
          startIcon={buttonLoader(busy)}
        >
          {busy ? 'Disconnecting…' : 'Disconnect Square'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
