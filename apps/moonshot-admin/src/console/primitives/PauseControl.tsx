import { Box, Button, MenuItem, MenuList, Paper, Popover, Typography } from '@mui/material';
import { useState, type MouseEvent } from 'react';
import { PAUSE_DURATION_OPTIONS, type PauseDuration } from './pause-durations.js';

type Props = {
  pausedUntilLabel?: string | null;
  onPause: (duration: PauseDuration) => void;
  onResume: () => void;
  onExtend15: () => void;
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
  const paused = Boolean(pausedUntilLabel);

  function openMenu(event: MouseEvent<HTMLElement>) {
    setAnchor(event.currentTarget);
  }

  if (paused) {
    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={onResume} disabled={disabled}>
          Resume now
        </Button>
        <Button variant="outlined" onClick={onExtend15} disabled={disabled} sx={{ color: 'inherit' }}>
          +15 min
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Button variant="contained" onClick={openMenu} disabled={disabled}>
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
                onClick={() => {
                  setAnchor(null);
                  onPause(opt.value);
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
