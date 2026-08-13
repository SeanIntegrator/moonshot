import { io, type Socket } from 'socket.io-client';

export type RealtimeStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'unauthorized'
  | 'failed';

export type RealtimeConnectContext = {
  recovered: boolean;
  isReconnect: boolean;
};

export interface RealtimeConnectionOptions {
  baseUrl: string;
  namespace: string;
  /** Invoked on every handshake (including recovery) so a rotated token is sent. */
  auth?: () => Record<string, unknown>;
  onStatusChange?(status: RealtimeStatus): void;
  onConnect?(ctx: RealtimeConnectContext): void;
  onAuthError?(error: Error): void;
  /** Foreground / back-online wake — always fired, even if already connected. */
  onResume?(): void;
  /** Attach visibility / pageshow / online listeners. Default true. */
  resumeOnVisibility?: boolean;
}

/** Escalate `reconnecting` → `failed` after this long, while the socket keeps retrying. */
export const REALTIME_FAILED_AFTER_MS = 30_000;

const RECONNECTION_DELAY_MS = 1_000;
const RECONNECTION_DELAY_MAX_MS = 5_000;
const CONNECT_TIMEOUT_MS = 20_000;

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isUnauthorizedMessage(message: string): boolean {
  return /unauthorized/i.test(message);
}

/**
 * One Socket.IO connection with a kitchen-grade lifecycle: heartbeat-tolerant
 * reconnect, handshake-auth as a callback, recovered-session signalling, and
 * immediate connect() on tab foreground / back-online.
 *
 * `forceNew` is always on — two consumers of the same namespace (e.g. order-ahead
 * menu + order tracking) must not share a Manager socket.
 */
export class RealtimeConnection {
  private socket: Socket;
  private opts: RealtimeConnectionOptions;
  private currentStatus: RealtimeStatus = 'idle';
  private hasConnected = false;
  private destroyed = false;
  private failedTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly onVisibility = (): void => {
    if (document.visibilityState === 'visible') this.resume();
  };
  private readonly onPageShow = (): void => {
    this.resume();
  };
  private readonly onOnline = (): void => {
    this.resume();
  };
  private readonly onReconnectFailed = (): void => {
    if (this.destroyed) return;
    this.clearFailedTimer();
    this.setStatus('failed');
  };

  constructor(opts: RealtimeConnectionOptions) {
    this.opts = opts;
    const base = opts.baseUrl.replace(/\/+$/, '');
    const nsp = opts.namespace.startsWith('/') ? opts.namespace : `/${opts.namespace}`;

    this.socket = io(`${base}${nsp}`, {
      transports: ['websocket', 'polling'],
      autoConnect: false,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: Number.POSITIVE_INFINITY,
      reconnectionDelay: RECONNECTION_DELAY_MS,
      reconnectionDelayMax: RECONNECTION_DELAY_MAX_MS,
      timeout: CONNECT_TIMEOUT_MS,
      auth: opts.auth ? (cb: (data: Record<string, unknown>) => void) => cb(this.opts.auth!()) : undefined,
    });

    this.socket.on('connect', () => {
      if (this.destroyed) return;
      this.clearFailedTimer();
      const recovered = Boolean(this.socket.recovered);
      const isReconnect = this.hasConnected;
      this.hasConnected = true;
      this.setStatus('connected');
      this.opts.onConnect?.({ recovered, isReconnect });
    });

    this.socket.on('disconnect', (reason: string) => {
      if (this.destroyed) return;
      if (!this.socket.active || reason === 'io server disconnect') {
        this.clearFailedTimer();
        this.setStatus('unauthorized');
        this.opts.onAuthError?.(new Error(reason));
        return;
      }
      this.enterDegraded();
    });

    this.socket.on('connect_error', (error: Error) => {
      if (this.destroyed) return;
      if (this.socket.active) {
        this.enterDegraded();
        return;
      }
      this.clearFailedTimer();
      if (isUnauthorizedMessage(error.message)) {
        this.setStatus('unauthorized');
        this.opts.onAuthError?.(error);
        return;
      }
      // Handshake denied for another reason (e.g. server CONFIG) — wait for resume.
      this.setStatus('failed');
    });

    this.socket.io.on('reconnect_failed', this.onReconnectFailed);

    if (opts.resumeOnVisibility !== false && isBrowser()) {
      document.addEventListener('visibilitychange', this.onVisibility);
      window.addEventListener('pageshow', this.onPageShow);
      window.addEventListener('online', this.onOnline);
    }
  }

  /** Replace callbacks / auth without tearing the socket down. */
  updateOptions(partial: Partial<RealtimeConnectionOptions>): void {
    this.opts = { ...this.opts, ...partial };
  }

  get status(): RealtimeStatus {
    return this.currentStatus;
  }

  get connected(): boolean {
    return this.socket.connected;
  }

  connect(): void {
    if (this.destroyed) return;
    if (this.socket.connected) return;
    if (this.currentStatus === 'idle' || this.currentStatus === 'failed') {
      this.setStatus('connecting');
    }
    this.socket.connect();
  }

  /**
   * Bypass reconnect backoff and notify the consumer to HTTP-reconcile.
   * Safe to call while already connected (foreground catch-up).
   */
  resume(): void {
    if (this.destroyed) return;
    if (!this.socket.connected) {
      if (this.currentStatus === 'idle' || this.currentStatus === 'failed') {
        this.setStatus('connecting');
      } else if (this.currentStatus !== 'connected' && this.currentStatus !== 'unauthorized') {
        this.setStatus('reconnecting');
      }
      this.socket.connect();
    }
    this.opts.onResume?.();
  }

  on(event: string, listener: (...args: unknown[]) => void): void {
    this.socket.on(event, listener);
  }

  off(event: string, listener: (...args: unknown[]) => void): void {
    this.socket.off(event, listener);
  }

  emit(event: string, ...args: unknown[]): void {
    this.socket.emit(event, ...args);
  }

  /**
   * Close the Engine.IO transport without `socket.disconnect()`.
   * Used to simulate a dropped connection so connection state recovery can run.
   */
  dropTransport(): void {
    this.socket.io.engine.close();
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.clearFailedTimer();
    if (isBrowser()) {
      document.removeEventListener('visibilitychange', this.onVisibility);
      window.removeEventListener('pageshow', this.onPageShow);
      window.removeEventListener('online', this.onOnline);
    }
    this.socket.io.off('reconnect_failed', this.onReconnectFailed);
    this.socket.removeAllListeners();
    this.socket.disconnect();
    this.currentStatus = 'idle';
  }

  private enterDegraded(): void {
    if (this.currentStatus === 'unauthorized') return;
    this.setStatus('reconnecting');
    if (this.failedTimer != null) return;
    this.failedTimer = setTimeout(() => {
      this.failedTimer = null;
      if (this.destroyed || this.currentStatus === 'connected' || this.currentStatus === 'unauthorized') {
        return;
      }
      this.setStatus('failed');
    }, REALTIME_FAILED_AFTER_MS);
  }

  private clearFailedTimer(): void {
    if (this.failedTimer == null) return;
    clearTimeout(this.failedTimer);
    this.failedTimer = null;
  }

  private setStatus(next: RealtimeStatus): void {
    if (this.currentStatus === next) return;
    this.currentStatus = next;
    this.opts.onStatusChange?.(next);
  }
}
