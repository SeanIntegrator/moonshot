import type { NormalisedModifierGroup, OrderLineModifierSelectionInput } from '@moonshot/types';
import { Box, Typography } from '@mui/material';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { formatModifierDelta } from '../lib/format.js';
import { sortOptionsForSlider } from '../lib/modifier-slider-groups.js';
import { StepSliderLabelButton, StepSliderThumb, StepSliderTrack } from './ui/StepSliderParts.js';

type Props = {
  group: NormalisedModifierGroup;
  selections: OrderLineModifierSelectionInput[];
  onSelect: (groupId: string, optionId: string) => void;
};

function optionLabel(name: string, chipLabel: string | null | undefined): string {
  return chipLabel?.trim() || name;
}

function stepPercent(index: number, count: number): number {
  if (count <= 1) return 0;
  return (index / (count - 1)) * 100;
}

/**
 * Discrete stepped control for modifier continua (shots / temp / texture).
 * Built in-house — MUI Slider mark % positioning collapses when width is indeterminate.
 */
export function ModifierOptionSlider({ group, selections, onSelect }: Props) {
  const options = useMemo(
    () => sortOptionsForSlider(group.name, group.options),
    [group.name, group.options],
  );
  const trackRef = useRef<HTMLDivElement>(null);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

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
  const lastIndex = Math.max(0, options.length - 1);

  const selectIndex = useCallback(
    (idx: number) => {
      const clamped = Math.max(0, Math.min(lastIndex, idx));
      const opt = options[clamped];
      if (opt) onSelect(group.id, opt.id);
    },
    [group.id, lastIndex, onSelect, options],
  );

  const indexFromPointer = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el || options.length <= 1) return 0;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return 0;
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      return Math.round(ratio * lastIndex);
    },
    [lastIndex, options.length],
  );

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (options.length <= 1) return;
    draggingRef.current = true;
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    selectIndex(indexFromPointer(e.clientX));
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    selectIndex(indexFromPointer(e.clientX));
  };

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault();
      selectIndex(valueIndex - 1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault();
      selectIndex(valueIndex + 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      selectIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      selectIndex(lastIndex);
    }
  };

  if (options.length === 0) return null;

  const thumbPct = stepPercent(valueIndex, options.length);
  const labelMaxWidth =
    options.length <= 1 ? '100%' : options.length === 2 ? '48%' : `${88 / (options.length - 1)}%`;

  return (
    <Box sx={{ mt: 2.5, '&:first-of-type': { mt: 0.5 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1, mb: 1.25 }}>
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

      <StepSliderTrack
        ref={trackRef}
        role="slider"
        tabIndex={0}
        aria-label={group.name}
        aria-valuemin={0}
        aria-valuemax={lastIndex}
        aria-valuenow={valueIndex}
        aria-valuetext={selected?.name ?? undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        sx={{ cursor: options.length > 1 ? 'pointer' : 'default' }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '50%',
            height: 4,
            mt: '-2px',
            borderRadius: 999,
            bgcolor: 'divider',
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            left: 0,
            top: '50%',
            height: 4,
            mt: '-2px',
            width: `${thumbPct}%`,
            borderRadius: 999,
            bgcolor: 'primary.main',
            pointerEvents: 'none',
          }}
        />
        {options.map((_, i) => (
          <Box
            key={`dot-${i}`}
            aria-hidden
            sx={{
              position: 'absolute',
              left: `${stepPercent(i, options.length)}%`,
              top: '50%',
              width: 8,
              height: 8,
              ml: '-4px',
              mt: '-4px',
              borderRadius: '50%',
              bgcolor: i <= valueIndex ? 'primary.main' : 'divider',
              pointerEvents: 'none',
            }}
          />
        ))}
        <StepSliderThumb
          aria-hidden
          data-step-slider-thumb
          dragging={dragging}
          sx={{ left: `${thumbPct}%` }}
        />
      </StepSliderTrack>

      <Box sx={{ position: 'relative', minHeight: 32, mx: 0.5, mt: 0.25, mb: 0.5 }}>
        {options.map((opt, i) => {
          const isFirst = i === 0;
          const isLast = i === lastIndex && options.length > 1;
          const label = optionLabel(opt.name, opt.chipLabel);
          const delta = formatModifierDelta(opt.priceMinor);
          return (
            <StepSliderLabelButton
              key={opt.id}
              onClick={() => selectIndex(i)}
              sx={{
                left: `${stepPercent(i, options.length)}%`,
                transform: isFirst ? 'none' : isLast ? 'translateX(-100%)' : 'translateX(-50%)',
                maxWidth: labelMaxWidth,
                textAlign: isFirst ? 'left' : isLast ? 'right' : 'center',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontSize: '0.7rem',
                  lineHeight: 1.15,
                  color: i === valueIndex ? 'text.primary' : 'text.secondary',
                  fontWeight: i === valueIndex ? 600 : 400,
                }}
              >
                {label}
                {delta ? (
                  <>
                    <br />
                    {delta}
                  </>
                ) : null}
              </Typography>
            </StepSliderLabelButton>
          );
        })}
      </Box>
    </Box>
  );
}
