import { Alert, Box, Button, Typography } from '@mui/material';
import { useCallback, useState } from 'react';
import { buttonLoader } from '../../console/primitives/button-loader.js';
import { startSquareConnect } from '../../lib/admin-api.js';

type Props = {
  token: string;
  onEditTemplate: () => void;
};

/**
 * Menu path choice — Square import vs Moonshot starter defaults.
 * Two clear option cards; no nested accordion chrome.
 */
export function MenuSetupChoice({ token, onEditTemplate }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectSquare = useCallback(async () => {
    setError(null);
    setBusy(true);
    try {
      const { url } = await startSquareConnect(token);
      window.location.href = url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start Square connect');
      setBusy(false);
    }
  }, [token]);

  return (
    <Box>
      <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>
        Build your menu
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
        Import your live Square catalogue, or start from Moonshot defaults and refine later.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <OptionCard
          title="Import from Square"
          description="Pull prices, items, and modifiers from your Square catalogue. Best if Square is already your source of truth."
          actionLabel={busy ? 'Connecting…' : 'Connect Square'}
          primary
          disabled={busy}
          busy={busy}
          onClick={() => void connectSquare()}
        />
        <OptionCard
          title="Start with a Moonshot menu"
          description="Pick drink categories and set key prices. Names and kitchen prep are filled in for you — edit anything later in the console."
          actionLabel="Choose starter menu"
          disabled={busy}
          onClick={onEditTemplate}
        />
      </Box>
    </Box>
  );
}

function OptionCard({
  title,
  description,
  actionLabel,
  primary,
  disabled,
  busy,
  onClick,
}: {
  title: string;
  description: string;
  actionLabel: string;
  primary?: boolean;
  disabled?: boolean;
  busy?: boolean;
  onClick: () => void;
}) {
  return (
    <Box
      sx={(theme) => ({
        border: `1px solid ${theme.console.card.border}`,
        borderRadius: 1.5,
        p: 2,
        bgcolor: theme.console.readonly.fill,
      })}
    >
      <Typography sx={{ fontWeight: 700, mb: 0.5 }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.75 }}>
        {description}
      </Typography>
      <Button
        variant={primary ? 'contained' : 'outlined'}
        fullWidth
        disabled={disabled}
        startIcon={busy ? buttonLoader(true) : undefined}
        onClick={onClick}
      >
        {actionLabel}
      </Button>
    </Box>
  );
}
