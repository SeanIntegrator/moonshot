import { API_VERSION_PREFIX } from '@moonshot/types';
import { Box, Container, Link, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { useCafe } from '../hooks/useCafe.js';

export function Home() {
  const { loading, error, cafe } = useCafe();

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, pb: 8 }}>
        <Typography color="text.secondary">Loading café…</Typography>
      </Container>
    );
  }

  if (error || !cafe) {
    return (
      <Container maxWidth="sm" sx={{ py: 2, pb: 8 }}>
        <Typography color="error">{error ?? 'Café unavailable'}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Check VITE_API_URL and VITE_CAFE_SLUG. API: <code>{API_VERSION_PREFIX}</code>
        </Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 8 }}>
      <Box
        component="header"
        sx={(theme) => ({
          bgcolor: theme.palette.cafe.heroBg,
          color: theme.palette.cafe.heroText,
          mx: -2,
          px: 2,
          py: 3,
          mb: 2,
        })}
      >
        <Typography variant="h4" component="h1" sx={{ color: 'inherit', m: 0 }}>
          {cafe.name}
        </Typography>
        <Typography sx={{ mt: 1, opacity: 0.9, color: 'inherit' }}>
          Order ahead · {cafe.slug}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Theme: <code>{cafe.themeId}</code> · POS: <code>{cafe.posProvider}</code>
      </Typography>
      <Link component={RouterLink} to="/menu" underline="hover" fontWeight={600}>
        Browse menu
      </Link>
    </Container>
  );
}
