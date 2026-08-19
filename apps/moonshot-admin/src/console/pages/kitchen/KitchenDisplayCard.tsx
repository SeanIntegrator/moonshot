import type { KdsDisplayPreferences, KdsGroupBy } from '@moonshot/types';
import { Box } from '@mui/material';
import { useEffect, useState } from 'react';
import { useCafe } from '../../CafeProvider.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';
import { useCafeSave } from '../../primitives/useCafePatch.js';
import { DisplayCard } from './DisplayCard.js';
import { LayoutCard } from './LayoutCard.js';

export function KitchenDisplayCard() {
  const { cafe } = useCafe();
  const savedLayout = cafe.kdsConfig.layout;
  const savedDisplay = cafe.kdsConfig.display;

  const [groupBy, setGroupBy] = useState<KdsGroupBy>(savedLayout.groupBy);
  const [display, setDisplay] = useState<KdsDisplayPreferences>(savedDisplay);
  const { saving, save: savePatch } = useCafeSave('Could not save kitchen display');

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
    await savePatch({
      kdsConfigPatch: {
        layout: { groupBy },
        display,
      },
    });
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
