import type { NormalisedModifierGroup, OrderLineModifierSelectionInput } from '@moonshot/types';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Chip, IconButton, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useEffect, useRef, useState } from 'react';
import { formatModifierDelta } from '../lib/format.js';
import { OptionColorDot, OptionTile, optionBorderColor } from './ui/OptionTile.js';

function colorDot(hex: string | null | undefined) {
  if (!hex) return null;
  return <OptionColorDot sx={{ bgcolor: hex }} />;
}

/** Shared price for a multi group when every option costs the same (e.g. syrups +30p). */
function uniformGroupDelta(group: NormalisedModifierGroup): string {
  if (group.options.length === 0) return '';
  const first = group.options[0]!.priceMinor;
  if (first <= 0) return '';
  if (!group.options.every((o) => o.priceMinor === first)) return '';
  return formatModifierDelta(first);
}

const OPTION_TRANSITION = 'background-color 180ms ease, border-color 180ms ease';

/** Multi-select chip surfaces — selected/idle from theme palette. */
const OptionChip = styled(Chip, {
  shouldForwardProp: (prop) => prop !== 'selected',
})<{ selected?: boolean }>(({ theme, selected }) => {
  const surface = {
    border: '0.5px solid',
    borderColor: optionBorderColor(theme, selected),
    backgroundColor: selected ? theme.palette.action.selected : theme.palette.background.paper,
    transition: OPTION_TRANSITION,
  };
  return {
    borderRadius: theme.radii.pill,
    ...surface,
    color: theme.palette.text.primary,
    fontWeight: 600,
    WebkitTapHighlightColor: 'transparent',
    // Keep press/hover fill identical to idle/selected so it doesn't mimic selection.
    '&.MuiChip-clickable:hover': surface,
    '&.MuiChip-clickable:active': surface,
    '&.Mui-focusVisible': surface,
    '& .MuiTouchRipple-root': { display: 'none' },
  };
});

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
        <Typography
          variant="subtitle1"
          sx={{
            fontWeight: 700,
            mb: 1
          }}>
          {group.name}
          {titleDelta ? (
            <Typography
              component="span"
              variant="body2"
              sx={{
                color: "text.secondary",
                fontWeight: 600,
                ml: 1
              }}>
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
                <OptionChip
                  key={opt.id}
                  clickable
                  selected={selected}
                  label={
                    <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                      {colorDot(opt.colorHex)}
                      {opt.name}
                    </Box>
                  }
                  onClick={() => onSelect(group.id, opt.id, 'multi', !selected)}
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
                border: '0.5px solid',
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
      <Typography
        variant="subtitle1"
        sx={{
          fontWeight: 700,
          mb: 1
        }}>
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
          return (
            <OptionTile
              key={opt.id}
              selected={selected}
              onClick={() => {
                if (group.selectionType === 'single') {
                  onSelect(group.id, opt.id, 'single', true);
                } else {
                  onSelect(group.id, opt.id, 'multi', !selected);
                }
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, width: '100%' }}>
                {colorDot(opt.colorHex)}
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    minWidth: 0,
                    flex: 1
                  }}>
                  {opt.name}
                </Typography>
                {delta ? (
                  <Typography
                    variant="caption"
                    sx={{
                      color: "text.secondary",
                      fontWeight: 600,
                      ml: 'auto',
                      flexShrink: 0
                    }}>
                    {delta}
                  </Typography>
                ) : null}
              </Box>
            </OptionTile>
          );
        })}
      </Box>
    </Box>
  );
}
