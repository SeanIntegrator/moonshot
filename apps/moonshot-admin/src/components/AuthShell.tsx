import { Box, Link, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import { getMarketingUrl } from '../lib/onboarding-utils.js';

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
};

/** Shared chrome for login and signup — Moonshot brand continuity from marketing. */
export function AuthShell({ children, title, subtitle }: Props) {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#0a0a0b',
        color: '#f4f4f5',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Box
        component="header"
        sx={{
          px: 3,
          py: 2,
          borderBottom: '1px solid #2a2a2e',
        }}
      >
        <Link
          href={getMarketingUrl()}
          underline="none"
          sx={{
            fontFamily: '"Syne", sans-serif',
            fontWeight: 800,
            fontSize: '1.25rem',
            color: '#f4f4f5',
            letterSpacing: '-0.02em',
          }}
        >
          Moonshot
        </Link>
      </Box>
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
        <Box sx={{ width: '100%', maxWidth: 480 }}>
          {title && (
            <Typography
              variant="h4"
              component="h1"
              sx={{
                fontFamily: '"Syne", sans-serif',
                fontWeight: 800,
                mb: subtitle ? 1 : 3,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body1" sx={{ color: '#71717a', mb: 3 }}>
              {subtitle}
            </Typography>
          )}
          <Box
            sx={{
              bgcolor: '#141416',
              border: '1px solid #2a2a2e',
              borderRadius: 2,
              p: { xs: 3, sm: 4 },
            }}
          >
            {children}
          </Box>
          <Typography variant="body2" sx={{ color: '#71717a', mt: 2, textAlign: 'center' }}>
            <Link component={RouterLink} to="/login" sx={{ color: '#e8ff47' }}>
              Sign in
            </Link>
            {' · '}
            <Link component={RouterLink} to="/signup" sx={{ color: '#e8ff47' }}>
              Create a café
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
