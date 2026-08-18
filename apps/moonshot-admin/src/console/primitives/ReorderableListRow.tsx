import CloseIcon from '@mui/icons-material/Close';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { Box, IconButton, Typography } from '@mui/material';
import type { HTMLAttributes, ReactNode } from 'react';
import { StateChip } from './StateChip.js';

type Chip = { tone: 'amber' | 'red'; label: string };

type Props = {
  name: string;
  priceLabel: string;
  thumbnail?: ReactNode;
  initials?: string;
  chip?: Chip;
  hint?: string;
  onRemove?: () => void;
  dragHandleProps?: HTMLAttributes<HTMLButtonElement>;
};

export function ReorderableListRow({
  name,
  priceLabel,
  thumbnail,
  initials,
  chip,
  hint,
  onRemove,
  dragHandleProps,
}: Props) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1.25 }}>
      <Box
        component="button"
        type="button"
        aria-label={`Reorder ${name}`}
        {...dragHandleProps}
        sx={{
          appearance: 'none',
          border: 0,
          bgcolor: 'transparent',
          color: 'text.secondary',
          cursor: 'grab',
          display: 'flex',
          p: 0.25,
        }}
      >
        <DragIndicatorIcon fontSize="small" />
      </Box>
      {thumbnail ?? (
        <Box
          sx={(theme) => ({
            width: 40,
            height: 40,
            borderRadius: 1,
            bgcolor: theme.console.readonly.fill,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 13,
            fontWeight: 600,
            color: theme.console.muted,
            flexShrink: 0,
          })}
        >
          {initials ?? name.slice(0, 2)}
        </Box>
      )}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
          {chip ? <StateChip tone={chip.tone}>{chip.label}</StateChip> : null}
        </Box>
        <Typography variant="body2">{priceLabel}</Typography>
        {hint ? (
          <Typography variant="body2" sx={(theme) => ({ color: theme.console.stock.outToday })}>
            {hint}
          </Typography>
        ) : null}
      </Box>
      {onRemove ? (
        <IconButton aria-label={`Remove ${name}`} size="small" onClick={onRemove}>
          <CloseIcon fontSize="small" />
        </IconButton>
      ) : null}
    </Box>
  );
}
