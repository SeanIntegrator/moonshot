import type { NormalisedModifierGroup, OrderLineModifierSelectionInput } from '@moonshot/types';
import CheckIcon from '@mui/icons-material/Check';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Box, Chip, IconButton, Typography } from '@mui/material';
import { useEffect, useRef, useState } from 'react';
import { formatMoney } from '../lib/format.js';

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
            }}
          >
            {group.options.map((opt) => {
              const selected = picked.has(opt.id);
              const price = opt.priceMinor > 0 ? ` +${formatMoney(opt.priceMinor)}` : '';
              return (
                <Chip
                  key={opt.id}
                  clickable
                  label={`${opt.name}${price}`}
                  icon={selected ? <CheckIcon /> : undefined}
                  onClick={() => onSelect(group.id, opt.id, 'multi', !selected)}
                  sx={{
                    borderRadius: 999,
                    border: 1,
                    borderColor: selected ? 'primary.main' : 'divider',
                    bgcolor: selected ? 'action.selected' : 'background.paper',
                    color: 'text.primary',
                    fontWeight: 600,
                    WebkitTapHighlightColor: 'transparent',
                    boxShadow: selected ? (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}` : 'none',
                    '& .MuiChip-icon': {
                      color: 'inherit',
                      fontSize: 16,
                      ml: 1,
                    },
                    '&:hover': {
                      bgcolor: selected ? 'action.selected' : 'action.hover',
                    },
                    '&:active': {
                      bgcolor: selected ? 'action.selected' : 'background.paper',
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
                '&:hover': { bgcolor: 'background.paper' },
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
                borderColor: selected ? 'primary.main' : 'divider',
                borderRadius: 1.25,
                bgcolor: selected ? 'action.selected' : 'background.paper',
                boxShadow: selected ? (theme) => `inset 0 0 0 1px ${theme.palette.primary.main}` : 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                color: 'text.primary',
                WebkitTapHighlightColor: 'transparent',
                appearance: 'none',
                '&:hover': {
                  bgcolor: selected ? 'action.selected' : 'action.hover',
                },
                '&:active': {
                  bgcolor: selected ? 'action.selected' : 'background.paper',
                },
                '&:focus': {
                  outline: 'none',
                },
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
