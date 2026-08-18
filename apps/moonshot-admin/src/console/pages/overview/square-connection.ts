import type { ConnectionTone } from '../../primitives/connection-tone.js';
import type { SquareConnectStatus } from '../../../lib/adminApi/pos.js';
import { formatTime24, formatUkShortDate } from '../../../lib/format.js';
import { isSameLocalDay } from './today-hours.js';

const STALE_MS = 24 * 60 * 60 * 1000;

export type SquareActionKind = 'connect' | 'sync' | 'reconnect';

export type SquareRowView = {
  tone: ConnectionTone;
  statusLabel: string;
  meta: string;
  actionKind: SquareActionKind;
  actionLabel: string;
  needsAttention: boolean;
  showOverflow: boolean;
};

export function squareRowView(
  status: SquareConnectStatus,
  opts: { timeZone: string; now?: Date; justSynced?: boolean },
): SquareRowView {
  const now = opts.now ?? new Date();

  if (!status.connected) {
    return {
      tone: 'disconnected',
      statusLabel: 'Not connected',
      meta: 'Connect Square to keep the menu in sync.',
      actionKind: 'connect',
      actionLabel: 'Connect',
      needsAttention: true,
      showOverflow: false,
    };
  }

  const expired =
    status.status === 'needs_reauth' ||
    (status.tokenExpiresAt != null && new Date(status.tokenExpiresAt).getTime() <= now.getTime());

  if (expired) {
    const when = status.tokenExpiresAt
      ? formatUkShortDate(new Date(status.tokenExpiresAt), opts.timeZone)
      : null;
    return {
      tone: 'expired',
      statusLabel: 'Reconnect needed',
      meta: when ? `Your Square login expired on ${when}` : 'Your Square login has expired.',
      actionKind: 'reconnect',
      actionLabel: 'Reconnect',
      needsAttention: true,
      showOverflow: true,
    };
  }

  if (status.catalogSyncStatus === 'syncing') {
    return {
      tone: 'syncing',
      statusLabel: 'Connected',
      meta: 'Checking Square for changes',
      actionKind: 'sync',
      actionLabel: 'Sync now',
      needsAttention: false,
      showOverflow: true,
    };
  }

  if (status.catalogSyncStatus === 'error') {
    return {
      tone: 'failed',
      statusLabel: 'Sync failed',
      meta: status.catalogSyncError?.trim() || "Couldn't reach Square. Try again.",
      actionKind: 'sync',
      actionLabel: 'Try again',
      needsAttention: true,
      showOverflow: true,
    };
  }

  const syncedAt = status.catalogLastSyncedAt ? new Date(status.catalogLastSyncedAt) : null;
  const stale = syncedAt != null && now.getTime() - syncedAt.getTime() > STALE_MS;

  if (opts.justSynced) {
    return {
      tone: 'succeeded',
      statusLabel: 'Connected',
      meta: 'Menu synced just now',
      actionKind: 'sync',
      actionLabel: 'Sync now',
      needsAttention: false,
      showOverflow: true,
    };
  }

  if (stale) {
    return {
      tone: 'stale',
      statusLabel: 'Connected',
      meta: syncedAt
        ? `Last synced ${formatStaleWhen(syncedAt, opts.timeZone)}`
        : 'Last synced more than 24 hours ago',
      actionKind: 'sync',
      actionLabel: 'Sync now',
      needsAttention: true,
      showOverflow: true,
    };
  }

  return {
    tone: 'healthy',
    statusLabel: 'Connected',
    meta: syncedAt ? `Menu synced ${formatFreshWhen(syncedAt, opts.timeZone, now)}` : 'Connected to Square',
    actionKind: 'sync',
    actionLabel: 'Sync now',
    needsAttention: false,
    showOverflow: true,
  };
}

function formatFreshWhen(syncedAt: Date, timeZone: string, now: Date): string {
  const time = formatTime24(syncedAt, timeZone);
  if (isSameLocalDay(syncedAt.toISOString(), timeZone, now)) return `${time} today`;
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long' }).format(syncedAt);
  return `${weekday} ${time}`;
}

function formatStaleWhen(syncedAt: Date, timeZone: string): string {
  const weekday = new Intl.DateTimeFormat('en-GB', { timeZone, weekday: 'long' }).format(syncedAt);
  return `${weekday} ${formatTime24(syncedAt, timeZone)}`;
}
