import { Typography } from '@mui/material';
import { useCafe } from '../../CafeProvider.js';
import { getOrderAheadBaseUrl } from '../../../lib/onboarding-utils.js';
import { CopyText } from '../../primitives/CopyText.js';
import { ReadOnlyPanel } from '../../primitives/ReadOnlyPanel.js';
import { SettingsCard } from '../../primitives/SettingsCard.js';

export function CustomerLinkCard() {
  const { cafe } = useCafe();
  const url = `${getOrderAheadBaseUrl()}/${cafe.slug}`;

  return (
    <SettingsCard title="Customer order link" description="Share this with customers.">
      <ReadOnlyPanel source="generated" helper="These can't be changed.">
        <Typography variant="body2" sx={{ mb: 0.75 }}>
          Order ahead
        </Typography>
        <CopyText value={url} aria-label="Copy order-ahead link" />
      </ReadOnlyPanel>
    </SettingsCard>
  );
}
