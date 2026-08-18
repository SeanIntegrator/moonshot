import { Box, FormControlLabel, Switch } from '@mui/material';
import { KitchenSection } from './KitchenSection.js';

type DisplayFlag = 'showCustomerNameInHeader' | 'showPickupTime' | 'showOrderSource';

type Props = {
  showCustomerNameInHeader: boolean;
  showPickupTime: boolean;
  showOrderSource: boolean;
  disabled?: boolean;
  onChange: (field: DisplayFlag, value: boolean) => void;
};

export function DisplayCard({
  showCustomerNameInHeader,
  showPickupTime,
  showOrderSource,
  disabled,
  onChange,
}: Props) {
  return (
    <KitchenSection title="WHAT'S SHOWN">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
        <FormControlLabel
          sx={{ ml: 0 }}
          control={
            <Switch
              checked={showCustomerNameInHeader}
              disabled={disabled}
              onChange={(_, v) => onChange('showCustomerNameInHeader', v)}
            />
          }
          label="Customer name in the ticket header"
        />
        <FormControlLabel
          sx={{ ml: 0 }}
          control={
            <Switch
              checked={showOrderSource}
              disabled={disabled}
              onChange={(_, v) => onChange('showOrderSource', v)}
            />
          }
          label="Order type"
        />
        <FormControlLabel
          sx={{ ml: 0 }}
          control={
            <Switch
              checked={showPickupTime}
              disabled={disabled}
              onChange={(_, v) => onChange('showPickupTime', v)}
            />
          }
          label="Pickup time"
        />
      </Box>
    </KitchenSection>
  );
}
