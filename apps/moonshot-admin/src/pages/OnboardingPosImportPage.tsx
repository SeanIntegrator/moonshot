import { Box, Button, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export function OnboardingPosImportPage() {
  const navigate = useNavigate();
  const { session } = useAuth();

  if (!session) return null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100', py: 4 }}>
      <Box sx={{ maxWidth: 640, mx: 'auto', px: 2 }}>
        <Typography
          variant="h5"
          component="h1"
          sx={{ fontFamily: '"Syne", sans-serif', fontWeight: 800, mb: 1 }}
        >
          Import from POS
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Set up {session.cafe.name}
        </Typography>

        <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3, boxShadow: 1, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Coming soon
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Connect Square or another POS to pull your menu automatically. For now, use the starter
            template to get live quickly.
          </Typography>
          <Button variant="contained" fullWidth onClick={() => navigate('/onboarding')}>
            Back to menu setup
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
