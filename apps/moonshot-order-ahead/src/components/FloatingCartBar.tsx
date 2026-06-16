import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { Box, Button, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { formatMoney } from '../lib/format.js';
import { useCafePath } from '../hooks/useCafePath.js';

type Props = {
  itemCount: number;
  totalMinor: number;
  currency?: string;
};

export function FloatingCartBar({ itemCount, totalMinor, currency = 'GBP' }: Props) {
  const cafePath = useCafePath();
  if (itemCount === 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 56,
        left: 0,
        right: 0,
        zIndex: (t) => t.zIndex.appBar - 1,
        maxWidth: 600,
        mx: 'auto',
        px: 2,
        pb: 1,
      }}
    >
      <Button
        component={RouterLink}
        to={cafePath('/checkout')}
        fullWidth
        sx={{
          py: 1.5,
          px: 2,
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          borderRadius: 1.5,
          display: 'flex',
          justifyContent: 'space-between',
          '&:hover': { bgcolor: 'primary.dark' },
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
    </Box>
  );
}
