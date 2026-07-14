import WifiOffOutlinedIcon from '@mui/icons-material/WifiOffOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { Box, Button, Container, ThemeProvider, Typography } from '@mui/material';
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { ConnectivityError, isNetworkError, toUserFacingError } from '../lib/network-error.js';
import { baseMuiTheme } from '../theme/muiBaseTheme.js';

type Props = { children: ReactNode };
type State = { error: Error | null };

function ErrorFallback({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const offline = isNetworkError(error) || error instanceof ConnectivityError;
  const message = toUserFacingError(error);

  return (
    <ThemeProvider theme={baseMuiTheme}>
      <Box
        sx={{
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: 2,
          bgcolor: 'background.default',
        }}
      >
        <Container maxWidth="xs" sx={{ textAlign: 'center' }}>
          {offline ? (
            <WifiOffOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          ) : (
            <ErrorOutlineOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          )}
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {offline ? 'Connection problem' : 'Something went wrong'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {message}
          </Typography>
          <Button variant="contained" fullWidth sx={{ py: 1.5 }} onClick={onRetry}>
            Try again
          </Button>
        </Container>
      </Box>
    </ThemeProvider>
  );
}

/** Catches uncaught render errors — including connectivity failures re-thrown from providers. */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('AppErrorBoundary', error, info.componentStack);
  }

  handleRetry = (): void => {
    this.setState({ error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.error) {
      return <ErrorFallback error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
