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
  onContinueToPayments: () => void;
};

/** Menu step: Square import, template builder, or "already saved" shortcut. */
export function MenuStep({
  hasMenuItem,
  menuSetupView,
  busy,
  token,
  onSetMenuSetupView,
  onSaveMenuTemplate,
  onContinueToPayments,
}: Props) {
  if (hasMenuItem) {
    return (
      <Box>
        <Typography variant="h6" gutterBottom>
          Starter menu saved
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            marginBottom: "16px"
          }}>
          Your menu is ready for customers. You can add specialty items from the dashboard after
          setup.
        </Typography>
        <Button variant="contained" fullWidth onClick={onContinueToPayments}>
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

  return (
    <MenuSetupChoice
      token={token}
      onEditTemplate={() => onSetMenuSetupView('template')}
    />
  );
}
