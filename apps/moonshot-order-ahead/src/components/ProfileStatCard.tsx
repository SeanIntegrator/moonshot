import { Box, Typography } from '@mui/material';

type Props = {
  value: string | number;
  label: string;
};

export function ProfileStatCard({ value, label }: Props) {
  return (
    <Box
      sx={{
        flex: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1.25,
        p: 1.5,
        textAlign: 'center',
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="h5" fontWeight={700}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
    </Box>
  );
}
