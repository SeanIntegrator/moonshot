import Box, { type BoxProps } from '@mui/material/Box';
import ButtonBase from '@mui/material/ButtonBase';
import { styled } from '@mui/material/styles';
import type { ComponentType } from 'react';

export type StepSliderThumbProps = BoxProps & { dragging?: boolean };

/** Discrete slider thumb — focus ring via parent `&:focus-visible &`. */
export const StepSliderThumb: ComponentType<StepSliderThumbProps> = styled(Box, {
  shouldForwardProp: (prop) => prop !== 'dragging',
})<{ dragging?: boolean }>(({ theme, dragging }) => ({
  position: 'absolute',
  top: '50%',
  width: 20,
  height: 20,
  marginLeft: -10,
  marginTop: -10,
  borderRadius: '50%',
  backgroundColor: theme.palette.primary.main,
  border: `2px solid ${theme.palette.common.white}`,
  boxShadow: theme.shadows[1],
  pointerEvents: 'none',
  transition: dragging ? 'none' : 'left 120ms ease-out',
}));

export const StepSliderTrack = styled(Box)(({ theme }) => ({
  position: 'relative',
  height: 28,
  marginLeft: theme.spacing(0.5),
  marginRight: theme.spacing(0.5),
  outline: 'none',
  touchAction: 'none',
  // Emotion resolves nested styled component to its generated class.
  [`&:focus-visible ${StepSliderThumb}`]: {
    boxShadow: `0 0 0 3px ${theme.palette.primary.main}33`,
  },
})) as typeof Box;

/** Clickable step label under the slider. */
export const StepSliderLabelButton = styled(ButtonBase)({
  position: 'absolute',
  top: 0,
  userSelect: 'none',
}) as typeof ButtonBase;
