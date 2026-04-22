import { API_VERSION_PREFIX } from '@moonshot/types';
import { AppBar, Box, Container, Toolbar, Typography } from '@mui/material';

export function App() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'grey.100' }}>
      <AppBar position="static" color="default" elevation={0}>
        <Toolbar>
          <Typography variant="h6" component="div">
            Moonshot Admin
          </Typography>
        </Toolbar>
      </AppBar>
      <Container sx={{ py: 3 }}>
        <Typography variant="body1" gutterBottom>
          Café owner dashboard shell (MUI).
        </Typography>
        <Typography variant="body2" color="text.secondary">
          API prefix from <code>@moonshot/types</code>: <code>{API_VERSION_PREFIX}</code>
        </Typography>
      </Container>
    </Box>
  );
}
