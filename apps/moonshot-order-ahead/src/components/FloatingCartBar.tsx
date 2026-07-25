import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { Box, Slide, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatMoney } from '../lib/format.js';
import { useCafePath } from '../hooks/useCafePath.js';
import { pageContentWidthSx } from '../theme/pageLayout.js';
import { FloatingCartButton, FloatingClosedBanner } from './ui/FixedBottomBar.js';

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
          ...pageContentWidthSx,
        }}
      >
        {cafeClosed ? (
          <FloatingClosedBanner role="status">
            <Typography variant="body2" fontWeight={600}>
              {closedMessage}
            </Typography>
          </FloatingClosedBanner>
        ) : (
          <FloatingCartButton component={RouterLink} to={cafePath('/checkout')} fullWidth>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingBagOutlinedIcon fontSize="small" />
              <Typography variant="body2" fontWeight={600}>
                {itemCount} item{itemCount !== 1 ? 's' : ''} · {formatMoney(totalMinor, currency)}
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={600} sx={{ display: 'flex', alignItems: 'center' }}>
              Checkout <ChevronRightIcon fontSize="small" />
            </Typography>
          </FloatingCartButton>
        )}
      </Box>
    </Slide>
  );
}
