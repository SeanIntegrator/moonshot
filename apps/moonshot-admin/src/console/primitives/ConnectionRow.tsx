import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { Box, Button, IconButton, Menu, MenuItem, Typography } from '@mui/material';
import { useState, type MouseEvent, type ReactNode } from 'react';
import { connectionDotColor, type ConnectionTone } from './connection-tone.js';
import { ConnectionDot } from './ConnectionDot.js';
import { buttonLoader } from './button-loader.js';

export type ConnectionOverflowAction = {
  label: string;
  onClick: () => void;
  destructive?: boolean;
};

type Props = {
  name: string;
  logo: ReactNode;
  tone: ConnectionTone;
  statusLabel: string;
  meta: string;
  actionLabel?: string;
  actionBusy?: boolean;
  actionBusyLabel?: string;
  onAction?: () => void;
  overflow?: ConnectionOverflowAction[];
};

export function ConnectionRow({
  name,
  logo,
  tone,
  statusLabel,
  meta,
  actionLabel,
  actionBusy,
  actionBusyLabel,
  onAction,
  overflow,
}: Props) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const dot = connectionDotColor(tone);

  function openOverflow(event: MouseEvent<HTMLElement>) {
    setAnchor(event.currentTarget);
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1.5,
        py: 1.5,
      }}
    >
      <Box
        sx={{
          width: 60,
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
        }}
      >
        {logo}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, lineHeight: 1.3 }}>{name}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, mt: 0.25 }}>
          <ConnectionDot tone={tone} />
          <Typography
            variant="body2"
            sx={(theme) => ({
              color:
                dot === 'healthy'
                  ? theme.console.connection.healthy
                  : dot === 'stale'
                    ? theme.console.connection.stale
                    : theme.console.connection.failed,
            })}
          >
            {statusLabel}
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ mt: 0.25 }}>
          {meta}
        </Typography>
      </Box>
      {actionLabel && onAction ? (
        <Button
          variant="outlined"
          size="small"
          onClick={onAction}
          disabled={actionBusy}
          startIcon={buttonLoader(Boolean(actionBusy))}
        >
          {actionBusy ? (actionBusyLabel ?? 'Syncing…') : actionLabel}
        </Button>
      ) : null}
      {overflow && overflow.length > 0 ? (
        <>
          <IconButton aria-label={`${name} actions`} size="small" onClick={openOverflow}>
            <MoreHorizIcon fontSize="small" />
          </IconButton>
          <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
            {overflow.map((item) => (
              <MenuItem
                key={item.label}
                onClick={() => {
                  setAnchor(null);
                  item.onClick();
                }}
                sx={item.destructive ? { color: 'error.main' } : undefined}
              >
                {item.label}
              </MenuItem>
            ))}
          </Menu>
        </>
      ) : null}
    </Box>
  );
}
