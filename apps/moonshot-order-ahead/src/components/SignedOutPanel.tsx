import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import { Box, Link, Typography } from '@mui/material';
import { SignInButton } from './auth/SignInButton.js';

type Props = {
  onContinueGuest?: () => void;
};

export function SignedOutPanel({ onContinueGuest }: Props) {
  return (
    <Box sx={{ textAlign: 'center', py: 6, px: 2 }}>
      <Box
        sx={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          bgcolor: 'action.hover',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 2,
        }}
      >
        <PersonOutlinedIcon sx={{ fontSize: 36, color: 'text.secondary' }} />
      </Box>
      <Typography variant="h6" gutterBottom sx={{
        fontWeight: 700
      }}>
        Sign in to Moonshot
      </Typography>
      <Typography
        variant="body2"
        sx={{
          color: "text.secondary",
          mb: 3,
          maxWidth: 280,
          mx: 'auto'
        }}>
        Earn stamps, save your usual, and skip the queue with order-ahead.
      </Typography>
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
        <SignInButton />
      </Box>
      {onContinueGuest && (
        <Link component="button" variant="body2" onClick={onContinueGuest} underline="hover" sx={{
          color: "text.secondary"
        }}>
          Continue as guest
        </Link>
      )}
    </Box>
  );
}
