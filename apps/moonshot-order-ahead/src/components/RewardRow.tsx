import CardGiftcardIcon from '@mui/icons-material/CardGiftcard';
import { Box, Switch, Typography } from '@mui/material';
import { SurfaceCard } from './ui/SurfaceCard.js';

type Props = {
  description: string;
  applied: boolean;
  onToggle: (applied: boolean) => void;
  disabled?: boolean;
};

export function RewardRow({ description, applied, onToggle, disabled }: Props) {
  return (
    <SurfaceCard
      sx={{
        borderColor: applied ? 'success.main' : 'divider',
        p: 1.5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 1,
        mt: 1,
        opacity: disabled && !applied ? 0.55 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
        <CardGiftcardIcon color={applied ? 'success' : 'action'} fontSize="small" />
        <Typography variant="body2" color={applied ? 'success.main' : 'text.primary'}>
          {description}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        fontWeight={600}
        color={applied ? 'success.main' : 'text.secondary'}
        sx={{ flexShrink: 0 }}
      >
        {applied ? 'Applied' : 'Apply'}
      </Typography>
      <Switch checked={applied} onChange={(e) => onToggle(e.target.checked)} disabled={disabled} size="small" />
    </SurfaceCard>
  );
}
