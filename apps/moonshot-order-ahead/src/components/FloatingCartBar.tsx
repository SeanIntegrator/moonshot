import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { Box, Button, Slide, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatMoney } from '../lib/format.js';
import { useCafePath } from '../hooks/useCafePath.js';

type Props = {
  itemCount: number;
  totalMinor: number;
  currency?: string;
  /** When true, show a fixed closed warning instead of the checkout cart bar. */
  cafeClosed?: boolean;
  closedMessage?: string;
};

export function FloatingCartBar({
  itemCount,
  totalMinor,
  currency = 'GBP',
  cafeClosed = false,
  closedMessage = 'Cafe is currently closed',
}: Props) {
  const cafePath = useCafePath();
  const visible = cafeClosed || itemCount > 0;

  return (
    <Slide direction="up" in={visible} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          bottom: 56,
          left: 0,
          right: 0,
          zIndex: (t) => t.zIndex.appBar - 1,
          maxWidth: 600,
          mx: 'auto',
        }}
      >
        {cafeClosed ? (
          <Box
            role="status"
            sx={{
              py: 1.5,
              px: 2,
              bgcolor: 'warning.main',
              color: 'warning.contrastText',
              borderRadius: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              textAlign: 'center',
            }}
          >
            <Typography variant="body2" fontWeight={600}>
              {closedMessage}
            </Typography>
          </Box>
        ) : (
          <Button
            component={RouterLink}
            to={cafePath('/checkout')}
            fullWidth
            sx={{
              py: 1.5,
              px: 2,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
              borderRadius: 0,
              display: 'flex',
              justifyContent: 'space-between',
              WebkitTapHighlightColor: 'transparent',
              transition: 'background-color 180ms ease, transform 180ms ease',
              '&:active': {
                transform: 'scale(0.99)',
                bgcolor: 'primary.dark',
              },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingBagOutlinedIcon fontSize="small" />
              <Typography variant="body2" fontWeight={600}>
                {itemCount} item{itemCount !== 1 ? 's' : ''} · {formatMoney(totalMinor, currency)}
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center' }}>
              Checkout <ChevronRightIcon fontSize="small" />
            </Typography>
          </Button>
        )}
      </Box>
    </Slide>
  );
}
