import type { KdsDisplayPreferences, KdsGroupBy } from '@moonshot/types';
import { Alert, Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { useCafe } from '../../CafeProvider.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { DisplayCard } from './DisplayCard.js';
import { LayoutCard } from './LayoutCard.js';

export function KitchenDisplayCard() {
  const { cafe, patchSettings } = useCafe();
  const savedLayout = cafe.kdsConfig.layout;
  const savedDisplay = cafe.kdsConfig.display;

  const [groupBy, setGroupBy] = useState<KdsGroupBy>(savedLayout.groupBy);
  const [display, setDisplay] = useState<KdsDisplayPreferences>(savedDisplay);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setGroupBy(savedLayout.groupBy);
    setDisplay(savedDisplay);
  }, [savedLayout.groupBy, savedDisplay]);

  const dirty =
    groupBy !== savedLayout.groupBy ||
    display.showCustomerNameInHeader !== savedDisplay.showCustomerNameInHeader ||
    display.showPickupTime !== savedDisplay.showPickupTime ||
    display.showOrderSource !== savedDisplay.showOrderSource;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await patchSettings({
        kdsConfigPatch: {
          layout: { groupBy },
          display,
        },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save kitchen display');
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard
      title="Kitchen display"
      description="What baristas see on the tablet."
      save={{
        label: 'Save kitchen display',
        dirty,
        saving,
        onSave: () => void save(),
      }}
    >
      {error ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <LayoutCard groupBy={groupBy} disabled={saving} onGroupBy={setGroupBy} />
        <DisplayCard
          showCustomerNameInHeader={display.showCustomerNameInHeader}
          showPickupTime={display.showPickupTime}
          showOrderSource={display.showOrderSource}
          disabled={saving}
          onChange={(field, value) => setDisplay((prev) => ({ ...prev, [field]: value }))}
        />
      </Box>
    </SettingsCard>
  );
}
