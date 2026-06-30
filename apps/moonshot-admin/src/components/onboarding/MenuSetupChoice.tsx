import { Box, Button, Typography } from '@mui/material';

type Props = {
  onEditTemplate: () => void;
  onImportPos: () => void;
  onBack: () => void;
};

export function MenuSetupChoice({ onEditTemplate, onImportPos, onBack }: Props) {
  return (
    <Box sx={{ bgcolor: 'white', borderRadius: 2, p: 3, boxShadow: 1 }}>
      <Typography variant="h6" gutterBottom>
        Set up your menu
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Start from our café template or import your existing catalogue from a POS. You can always
        edit items later in the dashboard.
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        <Button variant="contained" size="large" fullWidth onClick={onEditTemplate} sx={{ py: 1.5 }}>
          Edit template
        </Button>
        <Button variant="outlined" size="large" fullWidth onClick={onImportPos} sx={{ py: 1.5 }}>
          Import from POS
        </Button>
      </Box>

      <Button variant="text" sx={{ mt: 2 }} onClick={onBack}>
        Back
      </Button>
    </Box>
  );
}
