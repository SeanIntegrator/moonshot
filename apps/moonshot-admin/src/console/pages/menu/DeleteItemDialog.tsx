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
  itemName: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function DeleteItemDialog({ open, busy, itemName, onClose, onConfirm }: Props) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Delete item?</DialogTitle>
      <DialogContent>
        <Typography>
          “{itemName || 'Untitled'}” will be removed from your menu. This can&apos;t be undone.
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
          {busy ? 'Deleting…' : 'Delete item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
