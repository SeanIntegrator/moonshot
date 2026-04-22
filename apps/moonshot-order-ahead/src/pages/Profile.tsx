import { Box, Button, Container, Typography } from '@mui/material';
import { SignInButton } from '../components/auth/SignInButton.js';
import { useAuth } from '../hooks/useAuth.js';

export function Profile() {
  const { user, loading, signOut, isSignedIn } = useAuth();

  return (
    <Container maxWidth="sm" sx={{ py: 2, pb: 8 }}>
      <Typography variant="h4" component="h1" sx={{ mt: 0 }}>
        Profile
      </Typography>
      {loading && (
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Checking session…
        </Typography>
      )}
      {!loading && isSignedIn && user && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" component="p" sx={{ mb: 0.5 }}>
            {user.displayName ?? user.email}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {user.email}
          </Typography>
          <Button variant="outlined" color="primary" sx={{ mt: 2 }} onClick={() => signOut()}>
            Sign out
          </Button>
        </Box>
      )}
      {!loading && !isSignedIn && (
        <Box sx={{ mt: 2 }}>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Sign in with Google
          </Typography>
          <SignInButton />
        </Box>
      )}
    </Container>
  );
}
