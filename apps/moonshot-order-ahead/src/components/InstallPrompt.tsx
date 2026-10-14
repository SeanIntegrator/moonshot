import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useInstallPrompt } from '@moonshot/web-runtime/pwa';
import { pageContentWidthSx } from '../theme/pageLayout.js';

/** Shown only while Chromium is ready to install. Hidden after install or dismiss. */
export function InstallPrompt() {
  const { canInstall, install, dismiss } = useInstallPrompt();
  if (!canInstall) return null;

  return (
    <Paper
      component="aside"
      aria-label="Install app"
      elevation={6}
      sx={{
        mx: 2,
        mt: 1.5,
        mb: 0,
        px: 2,
        py: 1.25,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1.5,
        ...pageContentWidthSx,
      }}
    >
      <Typography variant="body2">Install to open full screen from your home screen.</Typography>
      <Button size="small" color="inherit" onClick={dismiss}>
        Not now
      </Button>
      <Button size="small" variant="contained" onClick={() => void install()}>
        Install
      </Button>
    </Paper>
  );
}
