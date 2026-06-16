import CheckIcon from '@mui/icons-material/Check';
import { Box, Typography } from '@mui/material';

const STEPS = ['Confirmed', 'Preparing', 'Ready', 'Done'] as const;

type Props = {
  stepIndex: number;
  completed?: boolean;
};

export function OrderStatusStepper({ stepIndex, completed = false }: Props) {
  return (
    <Box sx={{ mt: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <Box
          sx={{
            position: 'absolute',
            top: 14,
            left: '12%',
            right: '12%',
            height: 2,
            bgcolor: 'divider',
            zIndex: 0,
          }}
        />
        {STEPS.map((label, i) => {
          const done = completed || i < stepIndex;
          const active = !completed && i === stepIndex;
          return (
            <Box key={label} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', zIndex: 1, flex: 1 }}>
              <Box
                sx={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: done || active ? 'primary.main' : 'background.paper',
                  border: done || active ? 'none' : 1,
                  borderColor: 'divider',
                  color: done || active ? 'primary.contrastText' : 'text.secondary',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {done ? <CheckIcon sx={{ fontSize: 16 }} /> : i + 1}
              </Box>
              <Typography
                variant="caption"
                color={active ? 'text.primary' : 'text.secondary'}
                fontWeight={active ? 600 : 400}
                sx={{ mt: 0.75, textAlign: 'center' }}
              >
                {label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
