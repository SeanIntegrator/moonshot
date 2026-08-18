import { Alert, Box, FormControlLabel, Switch } from '@mui/material';
import { useState } from 'react';
import { useCafe } from '../../CafeProvider.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';

export function DisplayCard() {
  const { cafe, patchSettings } = useCafe();
  const display = cafe.kdsConfig.display;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function patchFlag(
    field: 'showCustomerNameInHeader' | 'showPickupTime' | 'showOrderSource',
    value: boolean,
  ) {
    setError(null);
    setBusy(field);
    try {
      await patchSettings({ kdsConfigPatch: { display: { [field]: value } } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update display');
    } finally {
      setBusy(null);
    }
  }

  return (
    <SettingsCard title="Display" description="What each ticket shows on the kitchen screen.">
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <FormControlLabel
          control={
            <Switch
              checked={display.showCustomerNameInHeader}
              disabled={busy !== null}
              onChange={(_, v) => void patchFlag('showCustomerNameInHeader', v)}
            />
          }
          label="Show customer name in header"
        />
        <FormControlLabel
          control={
            <Switch
              checked={display.showPickupTime}
              disabled={busy !== null}
              onChange={(_, v) => void patchFlag('showPickupTime', v)}
            />
          }
          label="Show pickup time"
        />
        <FormControlLabel
          control={
            <Switch
              checked={display.showOrderSource}
              disabled={busy !== null}
              onChange={(_, v) => void patchFlag('showOrderSource', v)}
            />
          }
          label="Show order source"
        />
      </Box>
    </SettingsCard>
  );
}
