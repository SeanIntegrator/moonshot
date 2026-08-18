import { Box, Paper, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import { SaveFooter } from './SaveFooter.js';

type Save = {
  label: string;
  dirty: boolean;
  valid?: boolean;
  saving?: boolean;
  onSave: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryVariant?: 'text' | 'outlined';
  start?: ReactNode;
  showUnsaved?: boolean;
};

type Props = {
  title?: ReactNode;
  description?: ReactNode;
  headerAction?: ReactNode;
  save?: Save;
  children: ReactNode;
};

/**
 * White settings card. Pass `save` only for form cards — switch-only cards
 * PATCH immediately and must not include a Save button.
 */
export function SettingsCard({ title, description, headerAction, save, children }: Props) {
  const showHeader = title != null || headerAction != null;
  return (
    <Paper
      sx={(theme) => ({
        p: { xs: 2, sm: 3 },
        border: `1px solid ${theme.console.card.border}`,
        borderRadius: `${theme.console.card.radiusPx}px`,
        overflow: 'hidden',
      })}
    >
      {showHeader || description ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2,
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            {title != null ? (
              <Typography variant="h3" component="h2">
                {title}
              </Typography>
            ) : null}
            {description ? (
              <Typography variant="body2" sx={{ mt: title != null ? 0.5 : 0 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
          {headerAction}
        </Box>
      ) : null}
      {children}
      {save ? <SaveFooter {...save} /> : null}
    </Paper>
  );
}
