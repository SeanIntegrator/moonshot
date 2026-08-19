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
  optionName: string;
  onClose: () => void;
  onConfirm: () => void;
};

export function RemoveOptionDialog({ open, optionName, onClose, onConfirm }: Props) {
  const label = optionName.trim() || 'this option';
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Remove “{label}”?</DialogTitle>
      <DialogContent>
        <Typography>
          This option will be removed from every drink that offers this list.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="contained" color="error" onClick={onConfirm}>
          Remove
        </Button>
      </DialogActions>
    </Dialog>
  );
}
