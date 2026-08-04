import CloseIcon from '@mui/icons-material/Close';
import { Dialog, DialogContent, IconButton, Typography } from '@mui/material';
import { QrCard } from './QrCard.js';

type Props = {
  open: boolean;
  onClose: () => void;
  displayId: string;
  name?: string;
  stamps?: number;
  stampsPerReward?: number;
};

export function QrModal({ open, onClose, displayId, name, stamps, stampsPerReward }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogContent sx={{ pt: 3, pb: 3, position: 'relative', px: 2.5 }}>
        <IconButton
          onClick={onClose}
          aria-label="Close"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            border: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 2.25
          }}>
          Your QR code
        </Typography>
        <QrCard displayId={displayId} name={name} stamps={stamps} stampsPerReward={stampsPerReward} size={180} />
      </DialogContent>
    </Dialog>
  );
}
