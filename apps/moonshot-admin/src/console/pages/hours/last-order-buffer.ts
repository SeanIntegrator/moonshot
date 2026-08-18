import type { LastOrderBufferMinutes } from '@moonshot/types';
import { LAST_ORDER_BUFFER_MINUTES } from '@moonshot/types';

export const LAST_ORDER_BUFFER_OPTIONS: ReadonlyArray<{
  value: LastOrderBufferMinutes;
  label: string;
}> = LAST_ORDER_BUFFER_MINUTES.map((value) => ({
  value,
  label: value === 0 ? 'at closing time' : `${value} minutes`,
}));
