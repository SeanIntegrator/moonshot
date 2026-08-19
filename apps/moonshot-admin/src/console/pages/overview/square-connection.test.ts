import { describe, expect, it } from 'vitest';
import type { SquareConnectStatus } from '@moonshot/types';
import { squareRowView } from './square-connection.js';

const base: SquareConnectStatus = {
  connected: true,
  merchantId: 'm',
  locationId: 'l',
  tokenExpiresAt: '2027-01-01T00:00:00.000Z',
  status: 'active',
  catalogLastSyncedAt: '2026-08-17T11:50:00.000Z',
  catalogSyncStatus: 'idle',
  catalogSyncError: null,
  locations: [],
};

const now = new Date('2026-08-17T12:00:00.000Z');

describe('squareRowView', () => {
  it('asks to connect when disconnected', () => {
    const row = squareRowView({ ...base, connected: false }, { timeZone: 'UTC', now });
    expect(row.tone).toBe('disconnected');
    expect(row.actionKind).toBe('connect');
    expect(row.needsAttention).toBe(true);
    expect(row.showOverflow).toBe(false);
  });

  it('expires when reauth is needed', () => {
    const row = squareRowView({ ...base, status: 'needs_reauth' }, { timeZone: 'UTC', now });
    expect(row.tone).toBe('expired');
    expect(row.actionKind).toBe('reconnect');
    expect(row.needsAttention).toBe(true);
  });

  it('expires when the token timestamp is in the past', () => {
    const row = squareRowView(
      { ...base, tokenExpiresAt: '2026-08-14T00:00:00.000Z' },
      { timeZone: 'UTC', now },
    );
    expect(row.tone).toBe('expired');
    expect(row.meta).toContain('14 Aug');
  });

  it('shows syncing', () => {
    const row = squareRowView({ ...base, catalogSyncStatus: 'syncing' }, { timeZone: 'UTC', now });
    expect(row.tone).toBe('syncing');
    expect(row.needsAttention).toBe(false);
  });

  it('shows sync failure', () => {
    const row = squareRowView(
      { ...base, catalogSyncStatus: 'error', catalogSyncError: null },
      { timeZone: 'UTC', now },
    );
    expect(row.tone).toBe('failed');
    expect(row.actionLabel).toBe('Try again');
    expect(row.needsAttention).toBe(true);
  });

  it('is stale after 24 hours', () => {
    const row = squareRowView(
      { ...base, catalogLastSyncedAt: '2026-08-14T11:50:00.000Z' },
      { timeZone: 'UTC', now },
    );
    expect(row.tone).toBe('stale');
    expect(row.needsAttention).toBe(true);
  });

  it('is healthy when recently synced', () => {
    const row = squareRowView(base, { timeZone: 'UTC', now });
    expect(row.tone).toBe('healthy');
    expect(row.meta).toContain('11:50 today');
    expect(row.needsAttention).toBe(false);
  });
});
