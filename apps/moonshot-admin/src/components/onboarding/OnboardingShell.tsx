import { Box, Link, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { getMarketingUrl } from '../../lib/onboarding-utils.js';
import { OnboardingProgress } from './OnboardingProgress.js';

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  /** Active step index 0–3 (Account … Payments). */
  activeStep: number;
  footer?: ReactNode;
  /** Wider for menu template / café setup. */
  maxWidth?: number;
};

/**
 * Light onboarding chrome using dashboardTheme tokens (no nested dark theme).
 * Matches console card language while staying narrower than AdminShell.
 */
export function OnboardingShell({
  children,
  title,
  subtitle,
  activeStep,
  footer,
  maxWidth = 560,
}: Props) {
  return (
    <Box
      sx={(theme) => ({
        minHeight: '100vh',
        bgcolor: theme.console.pageFill,
        color: theme.console.ink,
        display: 'flex',
        flexDirection: 'column',
      })}
    >
      <Box
        component="header"
        sx={(theme) => ({
          px: { xs: 2, sm: 3 },
          py: 1.75,
          bgcolor: '#fff',
          borderBottom: `1px solid ${theme.console.card.border}`,
        })}
      >
        <Link
          href={getMarketingUrl()}
          underline="none"
          sx={(theme) => ({
            fontWeight: 700,
            fontSize: '1.05rem',
            color: theme.console.ink,
            letterSpacing: '-0.02em',
          })}
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
          px: { xs: 2, sm: 3 },
          py: { xs: 3, sm: 4 },
        }}
      >
        <Box sx={{ width: '100%', maxWidth }}>
          {title ? (
            <Typography
              variant="h1"
              component="h1"
              sx={{ mb: subtitle ? 0.75 : 2, fontSize: { xs: '1.5rem', sm: '1.75rem' } }}
            >
              {title}
            </Typography>
          ) : null}
          {subtitle ? (
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5, maxWidth: 480 }}>
              {subtitle}
            </Typography>
          ) : null}

          <OnboardingProgress activeStep={activeStep} />

          <Box
            sx={(theme) => ({
              bgcolor: theme.console.card.bg,
              border: `1px solid ${theme.console.card.border}`,
              borderRadius: `${theme.console.card.radiusPx}px`,
              p: { xs: 2.5, sm: 3.5 },
            })}
          >
            {children}
          </Box>

          {footer != null ? (
            <Typography
              variant="body2"
              sx={{ color: 'text.secondary', mt: 2, textAlign: 'center' }}
            >
              {footer}
            </Typography>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
