import AccessTimeIcon from '@mui/icons-material/AccessTime';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import type { PickupEstimateResponse } from '@moonshot/types';
import { alpha, Box, Chip, Menu, MenuItem, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { formatTime } from '../lib/format.js';
import {
  pickupDelayOptions,
  type PickupDelayMinutes,
} from '../lib/pickup-delay-options.js';

export type { PickupDelayMinutes } from '../lib/pickup-delay-options.js';
export { pickupDelayOptions } from '../lib/pickup-delay-options.js';

export function pickupTimeForDelay(
  estimate: PickupEstimateResponse | null,
  delayMinutes: number,
): Date {
  if (delayMinutes === 0 && estimate) return new Date(estimate.pickupTime);
  return new Date(Date.now() + delayMinutes * 60_000);
}

function optionLabel(delayMinutes: number): string {
  return delayMinutes === 0 ? 'ASAP' : `In ${delayMinutes} min`;
}

type Props = {
  estimate: PickupEstimateResponse | null;
  value: PickupDelayMinutes;
  onChange: (minutes: PickupDelayMinutes) => void;
  /** Café `order_ahead.maxPickupMinutes` (default 60). */
  maxPickupMinutes?: number;
};

export function PickupTimeChip({
  estimate,
  value,
  onChange,
  maxPickupMinutes = 60,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const options = useMemo(() => pickupDelayOptions(maxPickupMinutes), [maxPickupMinutes]);
  const safeValue = options.includes(value) ? value : 0;
  const displayTime = formatTime(pickupTimeForDelay(estimate, safeValue).toISOString());

  const menuItems = useMemo(
    () =>
      options.map((minutes) => ({
        minutes,
        label: optionLabel(minutes),
        time: formatTime(pickupTimeForDelay(estimate, minutes).toISOString()),
      })),
    [estimate, options],
  );

  return (
    <>
      <Chip
        clickable
        onClick={(e) => setAnchorEl(e.currentTarget)}
        icon={<AccessTimeIcon sx={{ fontSize: '16px !important' }} />}
        label={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
            <Typography component="span" variant="body2" fontWeight={600} sx={{ lineHeight: 1.2 }}>
              Pickup at {displayTime}
            </Typography>
            <KeyboardArrowDownIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          </Box>
        }
        variant="filled"
        sx={(theme) => ({
          height: 'auto',
          py: 0.625,
          border: 'none',
          bgcolor: alpha(theme.palette.primary.main, 0.08),
          '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.12) },
          '& .MuiChip-label': { px: 0.5 },
          '& .MuiChip-icon': { ml: 1, mr: 0.75, color: 'text.secondary' },
        })}
      />
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {menuItems.map((item) => (
          <MenuItem
            key={item.minutes}
            selected={safeValue === item.minutes}
            onClick={() => {
              onChange(item.minutes);
              setAnchorEl(null);
            }}
          >
            {item.label} · {item.time}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
