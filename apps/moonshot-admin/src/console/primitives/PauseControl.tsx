import { Box, Button, MenuItem, MenuList, Paper, Popover, Typography } from '@mui/material';
import { useState, type MouseEvent } from 'react';
import { buttonLoader } from './button-loader.js';
import { PAUSE_DURATION_OPTIONS, type PauseDuration } from './pause-durations.js';

type BusyKind = 'pause' | 'resume' | 'extend';

type Props = {
  pausedUntilLabel?: string | null;
  onPause: (duration: PauseDuration) => void | Promise<unknown>;
  onResume: () => void | Promise<unknown>;
  onExtend15: () => void | Promise<unknown>;
  disabled?: boolean;
};

/**
 * Applies on click — no confirmation. Resume / +15 min replace the trigger
 * while a pause is in effect.
 */
export function PauseControl({
  pausedUntilLabel,
  onPause,
  onResume,
  onExtend15,
  disabled,
}: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [busy, setBusy] = useState<BusyKind | null>(null);
  const paused = Boolean(pausedUntilLabel);
  const locked = disabled || busy != null;

  async function run(kind: BusyKind, action: () => void | Promise<unknown>) {
    setBusy(kind);
    try {
      await action();
    } finally {
      setBusy(null);
    }
  }

  function openMenu(event: MouseEvent<HTMLElement>) {
    setAnchor(event.currentTarget);
  }

  if (paused) {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="contained"
          onClick={() => void run('resume', onResume)}
          disabled={locked}
          startIcon={buttonLoader(busy === 'resume')}
        >
          Resume now
        </Button>
        <Button
          variant="outlined"
          onClick={() => void run('extend', onExtend15)}
          disabled={locked}
          startIcon={buttonLoader(busy === 'extend')}
          sx={{ color: 'inherit' }}
        >
          +15 min
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Button
        variant="contained"
        onClick={openMenu}
        disabled={locked}
        startIcon={buttonLoader(busy === 'pause')}
      >
        Pause orders
      </Button>
      <Popover
        open={Boolean(anchor)}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Paper sx={{ minWidth: 220, py: 1 }}>
          <Typography variant="caption" sx={{ px: 2, py: 0.5, display: 'block' }}>
            Pause new orders for
          </Typography>
          <MenuList dense>
            {PAUSE_DURATION_OPTIONS.map((opt) => (
              <MenuItem
                key={opt.value}
                disabled={locked}
                onClick={() => {
                  setAnchor(null);
                  void run('pause', () => onPause(opt.value));
                }}
              >
                {opt.label}
              </MenuItem>
            ))}
          </MenuList>
          <Typography variant="caption" sx={{ px: 2, pb: 1, display: 'block' }}>
            Applies on click. No confirmation.
          </Typography>
        </Paper>
      </Popover>
    </>
  );
}
