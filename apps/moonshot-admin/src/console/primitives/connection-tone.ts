export type ConnectionTone =
  | 'healthy'
  | 'stale'
  | 'syncing'
  | 'succeeded'
  | 'failed'
  | 'expired'
  | 'disconnected';

export type ConnectionDotColor = 'healthy' | 'stale' | 'failed';

export function connectionDotColor(tone: ConnectionTone): ConnectionDotColor {
  switch (tone) {
    case 'healthy':
    case 'syncing':
    case 'succeeded':
      return 'healthy';
    case 'stale':
      return 'stale';
    case 'failed':
    case 'expired':
    case 'disconnected':
      return 'failed';
  }
}
