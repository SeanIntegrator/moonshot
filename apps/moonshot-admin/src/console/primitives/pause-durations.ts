export type PauseDuration = '15m' | '30m' | '1h' | 'rest_of_today';

export const PAUSE_DURATION_OPTIONS: ReadonlyArray<{
  value: PauseDuration;
  label: string;
}> = [
  { value: '15m', label: '15 minutes' },
  { value: '30m', label: '30 minutes' },
  { value: '1h', label: '1 hour' },
  { value: 'rest_of_today', label: 'Rest of today' },
];
