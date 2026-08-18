import { describe, expect, it } from 'vitest';
import { connectionDotColor } from './connection-tone.js';

describe('connectionDotColor', () => {
  it('maps operational states to green', () => {
    expect(connectionDotColor('healthy')).toBe('healthy');
    expect(connectionDotColor('syncing')).toBe('healthy');
    expect(connectionDotColor('succeeded')).toBe('healthy');
  });

  it('maps stale to orange', () => {
    expect(connectionDotColor('stale')).toBe('stale');
  });

  it('maps failures to red', () => {
    expect(connectionDotColor('failed')).toBe('failed');
    expect(connectionDotColor('expired')).toBe('failed');
    expect(connectionDotColor('disconnected')).toBe('failed');
  });
});
