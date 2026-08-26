import { Box, Button, Typography } from '@mui/material';
import { MenuSetupChoice } from './MenuSetupChoice.js';
import { MenuTemplateStep } from './MenuTemplateStep.js';
import type { AdminSaveMenuTemplateRequest } from '@moonshot/domain';

type Props = {
  hasMenuItem: boolean;
  menuSetupView: 'choice' | 'template';
  busy: boolean;
  token: string;
  onSetMenuSetupView: (view: 'choice' | 'template') => void;
  onSaveMenuTemplate: (payload: AdminSaveMenuTemplateRequest) => Promise<void>;
  onContinue: () => void;
};

/** Menu step: Square import, guided template, or “already saved” shortcut. */
export function MenuStep({
  hasMenuItem,
  menuSetupView,
  busy,
  token,
  onSetMenuSetupView,
  onSaveMenuTemplate,
  onContinue,
}: Props) {
  if (hasMenuItem) {
    return (
      <Box>
        <Typography variant="h3" component="h2" sx={{ mb: 0.5 }}>
          Menu ready
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2.5 }}>
          Your menu is set. You can add specialty items from the console after setup.
        </Typography>
        <Button variant="contained" fullWidth size="large" onClick={onContinue}>
          Continue
        </Button>
      </Box>
    );
  }

  if (menuSetupView === 'template') {
    return (
      <MenuTemplateStep
        busy={busy}
        onBack={() => onSetMenuSetupView('choice')}
        onSave={onSaveMenuTemplate}
      />
    );
  }

  return <MenuSetupChoice token={token} onEditTemplate={() => onSetMenuSetupView('template')} />;
}
