import type { NormalisedModifierGroup, OrderLineModifierSelectionInput } from '@moonshot/types';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Chip, IconButton, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { formatModifierDelta } from '../lib/format.js';

function colorDot(hex: string | null | undefined) {
  if (!hex) return null;
  return (
    <Box
      component="span"
      sx={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        bgcolor: hex,
        border: 1,
        borderColor: 'divider',
        flexShrink: 0,
      }}
    />
  );
}

/** Shared price for a multi group when every option costs the same (e.g. syrups +30p). */
function uniformGroupDelta(group: NormalisedModifierGroup): string {
  if (group.options.length === 0) return '';
  const first = group.options[0]!.priceMinor;
  if (first <= 0) return '';
  if (!group.options.every((o) => o.priceMinor === first)) return '';
  return formatModifierDelta(first);
}

const selectedOptionSx = {
  borderColor: 'divider',
  bgcolor: 'action.selected',
} as const;

const idleOptionSx = {
  borderColor: 'divider',
  bgcolor: 'background.paper',
} as const;

type Props = {
  group: NormalisedModifierGroup;
  selections: OrderLineModifierSelectionInput[];
  onSelect: (groupId: string, optionId: string, selectionType: 'single' | 'multi', checked: boolean) => void;
};

const COLLAPSED_CHIP_HEIGHT = 88;

export function ModifierOptionGrid({ group, selections, onSelect }: Props) {
  const picked = new Set(selections.filter((s) => s.groupId === group.id).map((s) => s.optionId));
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const chipWrapRef = useRef<HTMLDivElement | null>(null);
  const titleDelta = group.selectionType === 'multi' ? uniformGroupDelta(group) : '';

  useEffect(() => {
    if (group.selectionType !== 'multi') return;
    const node = chipWrapRef.current;
    if (!node) return;

    const updateOverflow = () => {
      setCanExpand(node.scrollHeight > COLLAPSED_CHIP_HEIGHT + 1);
    };

    updateOverflow();
    const resizeObserver = new ResizeObserver(updateOverflow);
    resizeObserver.observe(node);
    return () => resizeObserver.disconnect();
  }, [group.options.length, group.selectionType]);

  if (group.selectionType === 'multi') {
    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
          {group.name}
          {titleDelta ? (
            <Typography component="span" variant="body2" color="text.secondary" fontWeight={600} sx={{ ml: 1 }}>
              {titleDelta}
            </Typography>
          ) : null}
        </Typography>
        <Box sx={{ position: 'relative' }}>
          <Box
            ref={chipWrapRef}
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 1,
              maxHeight: expanded ? 'none' : COLLAPSED_CHIP_HEIGHT,
              overflow: 'hidden',
              pr: canExpand ? 4 : 0,
              transition: 'max-height 220ms ease',
            }}
          >
            {group.options.map((opt) => {
              const selected = picked.has(opt.id);
              return (
                <Chip
                  key={opt.id}
                  clickable
                  label={
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      {colorDot(opt.colorHex)}
                      {opt.name}
                    </Box>
                  }
                  onClick={() => onSelect(group.id, opt.id, 'multi', !selected)}
                  sx={{
                    borderRadius: 999,
                    border: 1,
                    ...(selected ? selectedOptionSx : idleOptionSx),
                    color: 'text.primary',
                    fontWeight: 600,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'background-color 180ms ease, border-color 180ms ease, transform 180ms ease',
                    '&:active': {
                      transform: 'scale(0.96)',
                    },
                  }}
                />
              );
            })}
          </Box>
          {canExpand && !expanded && (
            <Box
              sx={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 0,
                height: 36,
                pointerEvents: 'none',
                background: (theme) =>
                  `linear-gradient(180deg, ${theme.palette.background.default}00 0%, ${theme.palette.background.default} 82%)`,
              }}
            />
          )}
          {canExpand && (
            <IconButton
              size="small"
              aria-label={expanded ? `Collapse ${group.name}` : `Show all ${group.name}`}
              onClick={() => setExpanded((value) => !value)}
              sx={{
                position: 'absolute',
                right: 0,
                bottom: expanded ? -2 : 0,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 220ms ease',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <ExpandMoreIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>
    );
  }

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
          const delta = formatModifierDelta(opt.priceMinor);
          const sublabel = delta || (opt.isDefault ? 'Standard' : '');
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
                border: 1,
                borderRadius: 1.25,
                ...(selected ? selectedOptionSx : idleOptionSx),
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'text.primary',
                WebkitTapHighlightColor: 'transparent',
                appearance: 'none',
                transition: 'background-color 180ms ease, border-color 180ms ease, transform 180ms ease',
                '&:active': {
                  transform: 'scale(0.97)',
                },
                '&:focus': {
                  outline: 'none',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                {colorDot(opt.colorHex)}
                <Typography variant="body2" fontWeight={600}>
                  {opt.name}
                </Typography>
              </Box>
              {sublabel ? (
                <Typography variant="caption" color="text.secondary">
                  {sublabel}
                </Typography>
              ) : null}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
