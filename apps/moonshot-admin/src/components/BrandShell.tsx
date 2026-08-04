import { Box, Link, ThemeProvider, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { getMarketingUrl } from '../lib/onboarding-utils.js';
import { signupTheme } from '../theme/adminTheme.js';

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Optional stepper rendered above the card. */
  stepper?: ReactNode;
  /** Optional footer below the card (e.g. "Already have an account?"). */
  footer?: ReactNode;
  maxWidth?: number;
};

/**
 * Shared chrome for login, signup, and onboarding — Moonshot brand continuity.
 * Applies signupTheme so the dark/lime look spans the whole pre-dashboard journey.
 */
export function BrandShell({
  children,
  title,
  subtitle,
  stepper,
  footer,
  maxWidth = 480,
}: Props) {
  return (
    <ThemeProvider theme={signupTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          color: 'text.primary',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box
          component="header"
          sx={{
            px: 3,
            py: 2,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Link
            href={getMarketingUrl()}
            underline="none"
            sx={{
              fontFamily: '"Syne", sans-serif',
              fontWeight: 800,
              fontSize: '1.25rem',
              color: 'text.primary',
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
            alignItems: 'flex-start',
            justifyContent: 'center',
            px: 2,
            py: 4,
          }}
        >
          <Box sx={{ width: '100%', maxWidth }}>
            {title && (
              <Typography
                variant="h4"
                component="h1"
                sx={{
                  mb: subtitle ? 1 : 3,
                  letterSpacing: '-0.02em',
                }}
              >
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography
                variant="body1"
                sx={{
                  color: "text.secondary",
                  mb: 3
                }}>
                {subtitle}
              </Typography>
            )}
            {stepper}
            <Box
              sx={{
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                borderRadius: 2,
                p: { xs: 3, sm: 4 },
              }}
            >
              {children}
            </Box>
            {footer != null && (
              <Typography
                variant="body2"
                sx={{
                  color: "text.secondary",
                  mt: 2,
                  textAlign: 'center'
                }}>
                {footer}
              </Typography>
            )}
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}
