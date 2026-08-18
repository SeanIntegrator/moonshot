import { CircularProgress } from '@mui/material';

/** 16px spinner for contained/outlined buttons that disable while in flight. */
export function buttonLoader(busy: boolean) {
  return busy ? <CircularProgress size={16} color="inherit" /> : undefined;
}

/** 14px spinner beside an immediate switch while its PATCH is in flight. */
export function switchLoader(busy: boolean) {
  return busy ? <CircularProgress size={14} color="inherit" /> : null;
}
