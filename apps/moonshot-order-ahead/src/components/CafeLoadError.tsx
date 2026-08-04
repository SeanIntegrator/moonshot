import WifiOffOutlinedIcon from '@mui/icons-material/WifiOffOutlined';
import ErrorOutlineOutlinedIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { Box, Button, Container, Typography } from '@mui/material';

type Props = {
  message: string;
  isConnectivity: boolean;
  onRetry: () => void;
};

/** Recoverable café bootstrap failure — keeps users in-app instead of a hard error boundary. */
export function CafeLoadError({ message, isConnectivity, onRetry }: Props) {
  return (
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
        {isConnectivity ? (
          <WifiOffOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        ) : (
          <ErrorOutlineOutlinedIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        )}
        <Typography variant="h6" gutterBottom sx={{
          fontWeight: 700
        }}>
          {isConnectivity ? 'Connection problem' : 'Café unavailable'}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mb: 3
          }}>
          {message}
        </Typography>
        <Button variant="contained" fullWidth sx={{ py: 1.5 }} onClick={onRetry}>
          Try again
        </Button>
      </Container>
    </Box>
  );
}
