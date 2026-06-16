import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { Box, IconButton, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';

type Props = {
  title: string;
  backTo?: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export function PageHeader({ title, backTo, onBack, right }: Props) {
  const navigate = useNavigate();

  function handleBack() {
    if (onBack) onBack();
    else if (backTo) navigate(backTo);
    else navigate(-1);
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, minHeight: 40 }}>
      <IconButton
        onClick={handleBack}
        aria-label="Back"
        sx={{ border: 1, borderColor: 'divider', borderRadius: '50%' }}
        size="small"
      >
        <ArrowBackIcon fontSize="small" />
      </IconButton>
      <Typography variant="h5" component="h1" fontWeight={700} sx={{ flex: 1, textAlign: 'center' }}>
        {title}
      </Typography>
      <Box sx={{ width: 36, display: 'flex', justifyContent: 'flex-end' }}>{right ?? null}</Box>
    </Box>
  );
}
