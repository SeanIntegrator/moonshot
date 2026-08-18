import { Box, Container, Link, Typography } from '@mui/material';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { CONSOLE_TABS } from './console-nav.js';
import { useCafe } from './CafeProvider.js';
import { StatusPill } from './primitives/StatusPill.js';
import { resolveServiceStatus } from './service-status.js';

export function AdminShell() {
  const { session, logout } = useAuth();
  const { cafe, openStatus } = useCafe();
  const location = useLocation();

  if (!session) return null;

  const status = resolveServiceStatus({
    isOpen: openStatus.isOpen,
    timeZone: cafe.timezone,
    pausedUntil: cafe.pausedUntil,
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        sx={(theme) => ({
          bgcolor: '#fff',
          borderBottom: `1px solid ${theme.console.card.border}`,
        })}
      >
        <Container maxWidth="lg" sx={{ px: { xs: 2, sm: 3 } }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 2,
              py: 1.5,
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 700, lineHeight: 1.2 }}>Moonshot admin</Typography>
              <Typography variant="body2" sx={{ lineHeight: 1.3 }}>
                {cafe.name}
              </Typography>
            </Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: { xs: 1, sm: 2 },
                flexWrap: 'wrap',
                justifyContent: 'flex-end',
              }}
            >
              <StatusPill status={status} />
              <Typography
                variant="body2"
                sx={{ display: { xs: 'none', sm: 'block' } }}
              >
                {session.adminUser.email}
              </Typography>
              <Link
                component="button"
                type="button"
                onClick={logout}
                underline="always"
                sx={{ fontSize: 14, fontWeight: 500, color: 'text.secondary' }}
              >
                Sign out
              </Link>
            </Box>
          </Box>
          <Box
            component="nav"
            aria-label="Admin sections"
            sx={{
              display: 'flex',
              gap: { xs: 1, sm: 2 },
              overflowX: 'auto',
            }}
          >
            {CONSOLE_TABS.map((tab) => {
              const active = location.pathname === tab.to;
              return (
                <Box
                  key={tab.to}
                  component={NavLink}
                  to={tab.to}
                  sx={(theme) => ({
                    position: 'relative',
                    py: 1.25,
                    px: 0.25,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    fontSize: 14,
                    fontWeight: active ? 700 : 500,
                    color: active ? theme.console.ink : theme.console.muted,
                    borderBottom: '2px solid',
                    borderColor: active ? theme.console.ink : 'transparent',
                    '&:hover': { color: theme.console.ink },
                  })}
                >
                  {tab.label}
                </Box>
              );
            })}
          </Box>
        </Container>
      </Box>
      <Container maxWidth="lg" sx={{ py: 3, px: { xs: 2, sm: 3 } }}>
        <Outlet />
      </Container>
    </Box>
  );
}
