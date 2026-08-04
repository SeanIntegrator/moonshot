import { Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { BackButton, BackButtonIcon } from './ui/BackButton.js';

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
      <BackButton onClick={handleBack} aria-label="Back" size="small">
        <BackButtonIcon />
      </BackButton>
      <Typography
        variant="h5"
        component="h1"
        sx={{
          fontWeight: 700,
          flex: 1,
          textAlign: 'center'
        }}>
        {title}
      </Typography>
      <Box sx={{ width: 36, display: 'flex', justifyContent: 'flex-end' }}>{right ?? null}</Box>
    </Box>
  );
}
