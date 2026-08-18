import { Box } from '@mui/material';

export function SquareLogo() {
  return (
    <Box
      aria-hidden
      sx={{
        width: 32,
        height: 32,
        borderRadius: 0.75,
        bgcolor: '#000',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: '#fff' }} />
    </Box>
  );
}

export function StripeLogo() {
  return (
    <Box
      aria-hidden
      sx={{
        width: 32,
        height: 32,
        borderRadius: 0.75,
        bgcolor: '#635BFF',
        color: '#fff',
        fontSize: 18,
        fontWeight: 700,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Georgia, serif',
      }}
    >
      S
    </Box>
  );
}
