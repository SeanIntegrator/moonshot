import './index.css';
import type { KdsServerToClientEvent, NormalisedOrder } from '@moonshot/types';
import type { FormEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { type Socket, io } from 'socket.io-client';
import { getApiBaseUrl, kdsCompleteOrder, kdsFetchOrders, kdsLogin } from './lib/kds-api.js';

const SESSION_KEY = 'moonshot_kds_session';

type Session = {
  token: string;
  cafeName: string;
  cafeSlug: string;
  username: string;
};

function sortOrders(orders: NormalisedOrder[]): NormalisedOrder[] {
  return [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function loadSession(): Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Session;
    if (
      typeof p.token !== 'string' ||
      typeof p.cafeName !== 'string' ||
      typeof p.cafeSlug !== 'string' ||
      typeof p.username !== 'string'
    ) {
      return null;
    }
    return p;
  } catch {
    return null;
  }
}

function saveSession(s: Session | null): void {
  try {
    if (!s) sessionStorage.removeItem(SESSION_KEY);
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function formatMoney(minor: number, currency: string): string {
  const sym = currency === 'GBP' ? '£' : `${currency} `;
  return `${sym}${(minor / 100).toFixed(2)}`;
}

export function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [orders, setOrders] = useState<NormalisedOrder[]>([]);
  const [loginForm, setLoginForm] = useState({ cafeSlug: '', username: '', password: '' });
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const applyEvent = useCallback((ev: KdsServerToClientEvent) => {
    setOrders((prev) => {
      switch (ev.type) {
        case 'kds:order:new':
          return sortOrders([...prev.filter((o) => o.id !== ev.order.id), ev.order]);
        case 'kds:order:removed':
          return prev.filter((o) => o.id !== ev.orderId);
        case 'kds:order:updated':
          return sortOrders([...prev.filter((o) => o.id !== ev.order.id), ev.order]);
        case 'kds:eta:updated':
          return prev.map((o) => {
            const u = ev.updates.find((x) => x.orderId === o.id);
            if (!u) return o;
            return {
              ...o,
              pickup: { ...o.pickup, pickupTime: u.pickupTime },
            };
          });
        default:
          return prev;
      }
    });
  }, []);

  const refreshOrders = useCallback(async (token: string) => {
    const data = await kdsFetchOrders(token);
    setOrders(sortOrders(data.orders));
  }, []);

  useEffect(() => {
    if (!session) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setOrders([]);
      return;
    }

    const base = getApiBaseUrl();
    if (!base) {
      setError('VITE_API_URL is not set');
      return;
    }

    setError(null);
    void refreshOrders(session.token).catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load orders');
    });

    const socket = io(base, {
      auth: { token: session.token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setError(null);
      void refreshOrders(session.token).catch(() => {});
    });

    socket.on('kds:event', (ev: KdsServerToClientEvent) => {
      applyEvent(ev);
    });

    socket.on('disconnect', () => {
      setError((prev) => prev ?? 'Socket disconnected — reconciling periodically');
    });

    const interval = window.setInterval(() => {
      void refreshOrders(session.token).catch(() => {});
    }, 90_000);

    return () => {
      window.clearInterval(interval);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [session, applyEvent, refreshOrders]);

  async function handleLogin(e: FormEvent): Promise<void> {
    e.preventDefault();
    setError(null);
    try {
      const data = await kdsLogin({
        cafeSlug: loginForm.cafeSlug.trim(),
        username: loginForm.username.trim(),
        password: loginForm.password,
      });
      const s: Session = {
        token: data.token,
        cafeName: data.cafe.name,
        cafeSlug: data.cafe.slug,
        username: data.kdsUser.username,
      };
      saveSession(s);
      setSession(s);
      setLoginForm((f) => ({ ...f, password: '' }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  function logout(): void {
    saveSession(null);
    setSession(null);
    setError(null);
  }

  async function complete(orderId: string): Promise<void> {
    if (!session) return;
    setBusyId(orderId);
    setError(null);
    try {
      await kdsCompleteOrder(session.token, orderId);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Complete failed');
    } finally {
      setBusyId(null);
    }
  }

  if (!session) {
    return (
      <div className="kds-shell">
        <header className="kds-title">Moonshot KDS — Sign in</header>
        {error && (
          <p className="kds-error" role="alert">
            {error}
          </p>
        )}
        <form className="kds-form" onSubmit={(e) => void handleLogin(e)}>
          <label className="kds-label">
            Café slug
            <input
              className="kds-input"
              autoComplete="username"
              value={loginForm.cafeSlug}
              onChange={(e) => setLoginForm((f) => ({ ...f, cafeSlug: e.target.value }))}
              placeholder="e.g. clay-and-bean"
              required
            />
          </label>
          <label className="kds-label">
            KDS username
            <input
              className="kds-input"
              autoComplete="username"
              value={loginForm.username}
              onChange={(e) => setLoginForm((f) => ({ ...f, username: e.target.value }))}
              required
            />
          </label>
          <label className="kds-label">
            Password
            <input
              className="kds-input"
              type="password"
              autoComplete="current-password"
              value={loginForm.password}
              onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              required
            />
          </label>
          <button className="kds-button kds-button-primary" type="submit">
            Sign in
          </button>
        </form>
        <p className="kds-hint">Set `VITE_API_URL` to your API origin (no `/api/v1` suffix).</p>
      </div>
    );
  }

  return (
    <div className="kds-shell">
      <header className="kds-header">
        <h1 className="kds-title">Moonshot KDS</h1>
        <div className="kds-header-meta">
          <span className="kds-meta">
            {session.cafeName} ({session.cafeSlug}) — {session.username}
          </span>
          <button type="button" className="kds-button" onClick={() => logout()}>
            Sign out
          </button>
        </div>
      </header>
      {error && (
        <p className="kds-error" role="alert">
          {error}
        </p>
      )}
      {orders.length === 0 ? (
        <p className="kds-placeholder">No open orders. Waiting for tickets…</p>
      ) : (
        <ul className="kds-board">
          {orders.map((order) => (
            <li key={order.id} className="kds-card">
              <div className="kds-card-top">
                <span className="kds-card-name">{order.customerName}</span>
                <span className="kds-card-total">{formatMoney(order.totalMinor, order.currency)}</span>
              </div>
              <div className="kds-card-meta">
                <span>{order.orderType.replace('_', ' ')}</span>
                <span>{order.paymentStatus}</span>
                <span className="kds-card-time">{new Date(order.createdAt).toLocaleTimeString()}</span>
              </div>
              {order.notes ? <p className="kds-card-notes">{order.notes}</p> : null}
              <ul className="kds-lines">
                {order.items.map((item) => (
                  <li key={item.id} className="kds-line">
                    <span>
                      {item.quantity}× {item.itemName}
                    </span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                className="kds-button kds-button-done"
                disabled={busyId === order.id}
                onClick={() => void complete(order.id)}
              >
                {busyId === order.id ? 'Completing…' : 'Done'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
