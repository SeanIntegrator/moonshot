import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import { styled } from '@mui/material/styles';

/**
 * Pill segmented control (e.g. allergy none / I have allergies).
 * Brand surfaces come from theme so café merges re-skin the control.
 */
export const SegmentedToggleGroup = styled(ToggleButtonGroup)(({ theme }) => ({
  marginBottom: theme.spacing(1),
  backgroundColor: theme.palette.action.hover,
  borderRadius: 999,
  padding: theme.spacing(0.5),
  border: 0,
  '& .MuiToggleButtonGroup-grouped': {
    border: 0,
    borderRadius: '999px !important',
    margin: 0,
    flex: 1,
  },
  '& .MuiToggleButton-root': {
    border: 0,
    borderRadius: 999,
    paddingTop: theme.spacing(1),
    paddingBottom: theme.spacing(1),
    textTransform: 'none',
    fontWeight: 600,
    fontSize: '0.875rem',
    color: theme.palette.text.secondary,
    '&.Mui-selected': {
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
      boxShadow: theme.shadows[1],
      '&:hover': {
        backgroundColor: theme.palette.background.paper,
      },
    },
  },
})) as typeof ToggleButtonGroup;
