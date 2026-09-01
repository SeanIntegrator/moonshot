import PauseCircleOutlinedIcon from '@mui/icons-material/PauseCircleOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { Box, Typography } from '@mui/material';
import type { CafeOpenReason } from '@moonshot/types';
import { orderingUnavailableCopy } from '../lib/ordering-unavailable-copy.js';

type Props = {
  orderAheadEnabled: boolean;
  reason: CafeOpenReason;
  caption: string;
};

/** Home empty state while hours / pause / order-ahead block new orders. */
export function OrderingUnavailablePanel({ orderAheadEnabled, reason, caption }: Props) {
  const { title, body } = orderingUnavailableCopy({ orderAheadEnabled, reason, caption });
  const Icon =
    orderAheadEnabled && reason === 'paused' ? PauseCircleOutlinedIcon : StorefrontOutlinedIcon;

  return (
    <Box
      sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        px: 2,
        py: 4,
      }}
    >
      <Box sx={{ textAlign: 'center', maxWidth: 320 }}>
        <Icon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {body}
        </Typography>
      </Box>
    </Box>
  );
}
