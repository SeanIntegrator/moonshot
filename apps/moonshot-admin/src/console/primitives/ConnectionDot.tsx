import { Box } from '@mui/material';
import { connectionDotColor, type ConnectionTone } from './connection-tone.js';

export function ConnectionDot({ tone }: { tone: ConnectionTone }) {
  const dot = connectionDotColor(tone);
  return (
    <Box
      sx={(theme) => ({
        width: 8,
        height: 8,
        borderRadius: '50%',
        flexShrink: 0,
        bgcolor:
          dot === 'healthy'
            ? theme.console.connection.healthy
            : dot === 'stale'
              ? theme.console.connection.stale
              : theme.console.connection.failed,
      })}
    />
  );
}
