import type { NormalisedModifierGroup, OrderLineModifierSelectionInput } from '@moonshot/types';
import { Box, Typography } from '@mui/material';
import { formatMoney } from '../lib/format.js';

type Props = {
  group: NormalisedModifierGroup;
  selections: OrderLineModifierSelectionInput[];
  onSelect: (groupId: string, optionId: string, selectionType: 'single' | 'multi', checked: boolean) => void;
};

export function ModifierOptionGrid({ group, selections, onSelect }: Props) {
  const picked = new Set(selections.filter((s) => s.groupId === group.id).map((s) => s.optionId));

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
        {group.name}
      </Typography>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 1,
        }}
      >
        {group.options.map((opt) => {
          const selected = picked.has(opt.id);
          return (
            <Box
              key={opt.id}
              component="button"
              type="button"
              onClick={() => {
                if (group.selectionType === 'single') {
                  onSelect(group.id, opt.id, 'single', true);
                } else {
                  onSelect(group.id, opt.id, 'multi', !selected);
                }
              }}
              sx={{
                textAlign: 'left',
                p: 1.25,
                border: selected ? 2 : 1,
                borderColor: selected ? 'primary.main' : 'divider',
                borderRadius: 1.25,
                bgcolor: 'background.paper',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'text.primary',
              }}
            >
              <Typography variant="body2" fontWeight={600}>
                {opt.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {opt.priceMinor > 0
                  ? `+${formatMoney(opt.priceMinor)}`
                  : opt.isDefault
                    ? 'Standard'
                    : ''}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
