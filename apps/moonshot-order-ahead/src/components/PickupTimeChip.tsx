import AccessTimeIcon from '@mui/icons-material/AccessTime';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import type { PickupEstimateResponse } from '@moonshot/types';
import { alpha, Box, Chip, Menu, MenuItem, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { formatTime } from '../lib/format.js';

export const PICKUP_DELAY_OPTIONS = [0, 10, 20, 30, 40, 50, 60] as const;
export type PickupDelayMinutes = (typeof PICKUP_DELAY_OPTIONS)[number];

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
};

export function PickupTimeChip({ estimate, value, onChange }: Props) {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const displayTime = formatTime(pickupTimeForDelay(estimate, value).toISOString());

  const menuItems = useMemo(
    () =>
      PICKUP_DELAY_OPTIONS.map((minutes) => ({
        minutes,
        label: optionLabel(minutes),
        time: formatTime(pickupTimeForDelay(estimate, minutes).toISOString()),
      })),
    [estimate],
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
            selected={value === item.minutes}
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
