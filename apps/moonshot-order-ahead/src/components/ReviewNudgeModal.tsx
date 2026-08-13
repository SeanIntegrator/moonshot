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
  reviewUrl: string | null;
  submitting: boolean;
  onRateUs: () => void;
  onDismiss: () => void;
};

export function ReviewNudgeModal({
  open,
  reviewUrl,
  submitting,
  onRateUs,
  onDismiss,
}: Props) {
  return (
    <Dialog open={open} onClose={() => void onDismiss()} fullWidth maxWidth="xs">
      <DialogTitle sx={{ fontWeight: 700, pr: 2 }}>How was your visit?</DialogTitle>
      <DialogContent>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          If you enjoyed your order, a quick review helps other customers find us. It only takes a
          moment.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
        <Button onClick={() => void onDismiss()} disabled={submitting} color="inherit">
          Not now
        </Button>
        <Button
          variant="contained"
          onClick={() => void onRateUs()}
          disabled={submitting || !reviewUrl}
        >
          Rate us
        </Button>
      </DialogActions>
    </Dialog>
  );
}
