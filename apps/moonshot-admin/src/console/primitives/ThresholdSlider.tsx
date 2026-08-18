import { Box, Slider, Typography } from '@mui/material';
import { clampThresholds } from './threshold-slider.js';

type Props = {
  amberAfter: number;
  lateAfter: number;
  maxMinutes?: number;
  onChange: (next: { amberAfter: number; lateAfter: number }) => void;
};

export function ThresholdSlider({
  amberAfter,
  lateAfter,
  maxMinutes = 20,
  onChange,
}: Props) {
  const [amber, late] = clampThresholds(amberAfter, lateAfter, maxMinutes);
  const amberPct = (amber / maxMinutes) * 100;
  const latePct = (late / maxMinutes) * 100;

  return (
    <Box>
      <Typography variant="caption" sx={{ letterSpacing: '0.08em', fontWeight: 600 }}>
        ORDER AGE THRESHOLDS
      </Typography>
      <Typography variant="body2" sx={{ mt: 0.5, mb: 1.5 }}>
        Drag to set how many minutes a waiting order has before it turns amber, then late.
      </Typography>
      <Box sx={{ position: 'relative', px: 1, pt: 1 }}>
        <Box
          aria-hidden
          sx={(theme) => ({
            position: 'absolute',
            left: 8,
            right: 8,
            top: 18,
            height: 6,
            borderRadius: 999,
            overflow: 'hidden',
            display: 'flex',
            pointerEvents: 'none',
            bgcolor: theme.console.stock.out,
          })}
        >
          <Box
            sx={{
              width: `${amberPct}%`,
              bgcolor: (theme) => theme.console.ink,
            }}
          />
          <Box
            sx={{
              width: `${latePct - amberPct}%`,
              bgcolor: (theme) => theme.console.stock.outToday,
            }}
          />
        </Box>
        <Slider
          disableSwap
          min={0}
          max={maxMinutes}
          value={[amber, late]}
          onChange={(_, value) => {
            if (!Array.isArray(value)) return;
            const [nextAmber, nextLate] = clampThresholds(value[0] ?? amber, value[1] ?? late, maxMinutes);
            onChange({ amberAfter: nextAmber, lateAfter: nextLate });
          }}
          valueLabelDisplay="off"
          sx={{
            '& .MuiSlider-track': { opacity: 0 },
            '& .MuiSlider-rail': { opacity: 0 },
            '& .MuiSlider-thumb': { zIndex: 1 },
          }}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: -0.5 }}>
          <Typography variant="caption">0 min</Typography>
          <Typography variant="caption">{maxMinutes} min</Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
        <Box
          sx={(theme) => ({
            px: 1.5,
            py: 1,
            borderRadius: 1,
            bgcolor: theme.console.stock.outTodayRow,
            flex: 1,
          })}
        >
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
            Amber after <strong>{amber} min</strong>
          </Typography>
        </Box>
        <Box
          sx={(theme) => ({
            px: 1.5,
            py: 1,
            borderRadius: 1,
            bgcolor: theme.console.stock.outRow,
            flex: 1,
          })}
        >
          <Typography variant="body2" sx={{ color: 'text.primary' }}>
            Late after <strong>{late} min</strong>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
