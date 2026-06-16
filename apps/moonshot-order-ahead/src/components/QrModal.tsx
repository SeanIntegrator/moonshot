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
      <DialogContent sx={{ pt: 3, pb: 3, position: 'relative' }}>
        <IconButton
          onClick={onClose}
          aria-label="Close"
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            border: 1,
            borderColor: 'divider',
          }}
          size="small"
        >
          <CloseIcon fontSize="small" />
        </IconButton>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          Show at till
        </Typography>
        <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
          Your QR code
        </Typography>
        <QrCard displayId={displayId} name={name} stamps={stamps} stampsPerReward={stampsPerReward} size={180} />
      </DialogContent>
    </Dialog>
  );
}
