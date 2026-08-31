import CheckIcon from '@mui/icons-material/Check';
import { Box, Typography } from '@mui/material';
import { ONBOARDING_STEPS } from './onboarding-steps.js';

type Props = {
  /** 0-based index into ONBOARDING_STEPS. */
  activeStep: number;
};

/**
 * Informational four-step progress — not freely clickable.
 * Desktop: numbered/completed row. Mobile: compact “Step n of 4 · Label”.
 */
export function OnboardingProgress({ activeStep }: Props) {
  const clamped = Math.max(0, Math.min(activeStep, ONBOARDING_STEPS.length - 1));
  const current = ONBOARDING_STEPS[clamped]!;

  return (
    <Box sx={{ mb: 3 }} role="navigation" aria-label="Setup progress">
      {/* Mobile compact */}
      <Typography
        variant="body2"
        sx={{
          display: { xs: 'block', sm: 'none' },
          color: 'text.secondary',
          fontWeight: 600,
        }}
      >
        Step {clamped + 1} of {ONBOARDING_STEPS.length}
        <Box component="span" sx={{ color: 'text.primary', ml: 0.75 }}>
          · {current.label}
        </Box>
      </Typography>

      {/* Desktop row */}
      <Box
        sx={{
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          gap: 0,
        }}
        aria-hidden={false}
      >
        {ONBOARDING_STEPS.map((step, i) => {
          const completed = i < clamped;
          const active = i === clamped;
          return (
            <Box
              key={step.id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                flex: i < ONBOARDING_STEPS.length - 1 ? 1 : '0 0 auto',
                minWidth: 0,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <Box
                  aria-current={active ? 'step' : undefined}
                  sx={(theme) => ({
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    bgcolor: completed || active ? theme.console.ink : '#fff',
                    color: completed || active ? '#fff' : theme.console.muted,
                    border: `1px solid ${
                      completed || active ? theme.console.ink : theme.console.card.border
                    }`,
                  })}
                >
                  {completed ? <CheckIcon sx={{ fontSize: 16 }} /> : i + 1}
                </Box>
                <Typography
                  variant="body2"
                  sx={(theme) => ({
                    fontWeight: active ? 700 : 500,
                    color: active || completed ? theme.console.ink : theme.console.muted,
                    whiteSpace: 'nowrap',
                  })}
                >
                  {step.label}
                </Typography>
              </Box>
              {i < ONBOARDING_STEPS.length - 1 ? (
                <Box
                  sx={(theme) => ({
                    flex: 1,
                    height: 1,
                    mx: 1.5,
                    bgcolor: i < clamped ? theme.console.ink : theme.console.card.border,
                    minWidth: 12,
                  })}
                />
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
