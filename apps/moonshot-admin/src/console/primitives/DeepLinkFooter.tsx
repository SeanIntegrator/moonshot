import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Link as MuiLink } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';

type Props = {
  to: string;
  children: string;
};

export function DeepLinkFooter({ to, children }: Props) {
  return (
    <MuiLink
      component={RouterLink}
      to={to}
      underline="always"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      {children}
      <ArrowForwardIcon sx={{ fontSize: 16 }} />
    </MuiLink>
  );
}
