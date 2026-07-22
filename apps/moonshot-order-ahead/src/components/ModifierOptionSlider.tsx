import type { NormalisedModifierGroup, OrderLineModifierSelectionInput } from '@moonshot/types';
import { Box, Slider, Typography } from '@mui/material';
import { useMemo } from 'react';
import { formatModifierDelta } from '../lib/format.js';
import { sortOptionsForSlider } from '../lib/modifier-slider-groups.js';

type Props = {
  group: NormalisedModifierGroup;
  selections: OrderLineModifierSelectionInput[];
  onSelect: (groupId: string, optionId: string) => void;
};

function markLabel(name: string, chipLabel: string | null | undefined, priceMinor: number): string {
  const base = chipLabel?.trim() || name;
  const delta = formatModifierDelta(priceMinor);
  return delta ? `${base}\n${delta}` : base;
}

export function ModifierOptionSlider({ group, selections, onSelect }: Props) {
  const options = useMemo(
    () => sortOptionsForSlider(group.name, group.options),
    [group.name, group.options],
  );

  const selectedId =
    selections.find((s) => s.groupId === group.id)?.optionId ??
    options.find((o) => o.isDefault)?.id ??
    options[0]?.id ??
    null;

  const valueIndex = Math.max(
    0,
    options.findIndex((o) => o.id === selectedId),
  );
  const selected = options[valueIndex];
  const selectedDelta = selected ? formatModifierDelta(selected.priceMinor) : '';

  if (options.length === 0) return null;

  const marks = options.map((opt, i) => ({
    value: i,
    label: markLabel(opt.name, opt.chipLabel, opt.priceMinor),
  }));

  return (
    <Box sx={{ mt: 2.5, px: 0.5, pb: 2.5, '&:first-of-type': { mt: 0.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
        <Typography variant="subtitle2" fontWeight={700}>
          {group.name}
        </Typography>
        {selected ? (
          <Typography variant="body2" color="text.secondary" fontWeight={600}>
            {selected.name}
            {selectedDelta ? ` ${selectedDelta}` : ''}
          </Typography>
        ) : null}
      </Box>
      <Slider
        value={valueIndex}
        min={0}
        max={Math.max(0, options.length - 1)}
        step={1}
        marks={marks}
        valueLabelDisplay="off"
        onChange={(_, next) => {
          const idx = typeof next === 'number' ? next : next[0];
          if (idx == null) return;
          const opt = options[idx];
          if (opt) onSelect(group.id, opt.id);
        }}
        sx={{
          mt: 0.5,
          // Room for two-line marks (+price under chip label).
          '& .MuiSlider-markLabel': {
            whiteSpace: 'pre-line',
            textAlign: 'center',
            fontSize: '0.7rem',
            lineHeight: 1.15,
            color: 'text.secondary',
            top: 28,
          },
          '& .MuiSlider-thumb': {
            width: 20,
            height: 20,
          },
        }}
        aria-label={group.name}
      />
    </Box>
  );
}
