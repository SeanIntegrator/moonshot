import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { styled } from '@mui/material/styles';

/** Fixed bottom dock (item detail add-to-cart, etc.) — surface from theme. */
export const FixedBottomBar = styled(Box)(({ theme }) => ({
  position: 'fixed',
  bottom: 0,
  left: 0,
  right: 0,
  maxWidth: 600,
  marginLeft: 'auto',
  marginRight: 'auto',
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  paddingTop: theme.spacing(1.5),
  paddingBottom: theme.spacing(1.5),
  backgroundColor: theme.palette.background.paper,
  borderTop: `1px solid ${theme.palette.divider}`,
  display: 'flex',
  gap: theme.spacing(1.5),
  alignItems: 'center',
  zIndex: theme.zIndex.appBar,
})) as typeof Box;

/** Full-bleed primary cart CTA bar (menu floating checkout). */
export const FloatingCartButton = styled(Button)(({ theme }) => ({
  paddingTop: theme.spacing(1.5),
  paddingBottom: theme.spacing(1.5),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  backgroundColor: theme.palette.primary.main,
  color: theme.palette.primary.contrastText,
  borderRadius: 0,
  display: 'flex',
  justifyContent: 'space-between',
  WebkitTapHighlightColor: 'transparent',
  transition: 'background-color 180ms ease, transform 180ms ease',
  '&:hover': {
    backgroundColor: theme.palette.primary.dark || theme.palette.primary.main,
  },
  '&:active': {
    transform: 'scale(0.99)',
    backgroundColor: theme.palette.primary.dark || theme.palette.primary.main,
  },
})) as typeof Button;

/** Closed-café warning strip above bottom nav. */
export const FloatingClosedBanner = styled(Box)(({ theme }) => ({
  paddingTop: theme.spacing(1.5),
  paddingBottom: theme.spacing(1.5),
  paddingLeft: theme.spacing(2),
  paddingRight: theme.spacing(2),
  backgroundColor: theme.palette.warning.main,
  color: theme.palette.warning.contrastText,
  borderRadius: 0,
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  textAlign: 'center',
})) as typeof Box;
