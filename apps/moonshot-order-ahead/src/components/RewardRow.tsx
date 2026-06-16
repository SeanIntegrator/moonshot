import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { Box, Switch, Typography } from '@mui/material';

type Props = {
  description: string;
  applied: boolean;
  onToggle: (applied: boolean) => void;
  disabled?: boolean;
};

export function RewardRow({ description, applied, onToggle, disabled }: Props) {
  return (
    <Box
      sx={{
        border: 1,
        borderColor: applied ? 'success.main' : 'divider',
        borderRadius: 1.25,
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        mt: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
        <CardGiftcardIcon color={applied ? 'success' : 'action'} fontSize="small" />
        <Typography variant="body2" color={applied ? 'success.main' : 'text.primary'}>
          {description}
        </Typography>
      </Box>
      <Switch checked={applied} onChange={(e) => onToggle(e.target.checked)} disabled={disabled} size="small" />
      <ChevronRightIcon fontSize="small" color="disabled" />
    </Box>
  );
}
