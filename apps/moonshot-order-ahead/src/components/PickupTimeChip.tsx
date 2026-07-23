import AccessTimeIcon from '@mui/icons-material/AccessTime';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import type { PickupEstimateResponse } from '@moonshot/types';
import { Box, Chip, Menu, MenuItem, Typography } from '@mui/material';
import { useMemo, useState } from 'react';
import { formatTime } from '../lib/format.js';
import {
  pickupDelayOptions,
  type PickupDelayMinutes,
} from '../lib/pickup-delay-options.js';
import { PickupTimeFieldButton, pickupChipSx } from './ui/PickupTimeFieldButton.js';

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
  /**
   * `chip` — compact control for page headers (menu).
   * `field` — full-width form control for checkout.
   */
  variant?: 'chip' | 'field';
};

export function PickupTimeChip({
  estimate,
  value,
  onChange,
  maxPickupMinutes = 60,
  variant = 'chip',
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

  const menu = (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={() => setAnchorEl(null)}
      anchorOrigin={{ vertical: 'bottom', horizontal: variant === 'field' ? 'left' : 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: variant === 'field' ? 'left' : 'right' }}
      slotProps={{
        paper: { sx: { minWidth: variant === 'field' ? (anchorEl?.clientWidth ?? 280) : undefined } },
      }}
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
  );

  if (variant === 'field') {
    return (
      <>
        <PickupTimeFieldButton onClick={(e) => setAnchorEl(e.currentTarget)}>
          <AccessTimeIcon color="action" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="body1" fontWeight={700}>
              {displayTime}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {optionLabel(safeValue)}
              {safeValue === 0 && estimate ? ` · in ${estimate.minutesFromNow} min` : ''}
            </Typography>
          </Box>
          <KeyboardArrowDownIcon sx={{ color: 'text.secondary', flexShrink: 0 }} />
        </PickupTimeFieldButton>
        {menu}
      </>
    );
  }

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
        sx={pickupChipSx}
      />
      {menu}
    </>
  );
}
