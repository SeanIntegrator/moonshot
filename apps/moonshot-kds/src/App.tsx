import './index.css';
import type { FormEvent } from 'react';
import { useCallback, useState } from 'react';
import { useKdsOrders } from './hooks/useKdsOrders.js';
import { kdsLogin } from './lib/kds-api.js';
import {
  loadKdsSession,
  saveKdsSession,
  type KdsSession,
} from './lib/kds-session.js';

function formatMoney(minor: number, currency: string): string {
  const sym = currency === 'GBP' ? '£' : `${currency} `;
  return `${sym}${(minor / 100).toFixed(2)}`;
}

export function App() {
  const [session, setSession] = useState<KdsSession | null>(() => loadKdsSession());
  const [loginForm, setLoginForm] = useState({ cafeSlug: '', username: '', password: '' });
  const [loginError, setLoginError] = useState<string | null>(null);

  const clearExpiredSession = useCallback((current: KdsSession): void => {
    setLoginForm((f) => ({
      ...f,
      cafeSlug: current.cafeSlug,
      username: current.username,
      password: '',
    }));
    saveKdsSession(null);
    setSession(null);
  }, []);

  const { orders, error, setError, busyId, complete } = useKdsOrders({
    session,
    onSessionExpired: clearExpiredSession,
  });

  async function handleLogin(e: FormEvent): Promise<void> {
    e.preventDefault();
    setLoginError(null);
    setError(null);
    try {
      const data = await kdsLogin({
        cafeSlug: loginForm.cafeSlug.trim(),
        username: loginForm.username.trim(),
        password: loginForm.password,
      });
      const s: KdsSession = {
        token: data.token,
        cafeName: data.cafe.name,
        cafeSlug: data.cafe.slug,
        username: data.kdsUser.username,
      };
      saveKdsSession(s);
      setSession(s);
      setLoginForm((f) => ({ ...f, password: '' }));
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    }
  }

  function logout(): void {
    saveKdsSession(null);
    setSession(null);
    setError(null);
    setLoginError(null);
  }

  if (!session) {
    return (
      <div className="kds-shell">
        <header className="kds-title">Moonshot KDS — Sign in</header>
        {loginError && (
          <p className="kds-error" role="alert">
            {loginError}
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
                <span className="kds-card-time">
                  Pickup{' '}
                  {new Date(
                    order.pickup.pickupTime ?? order.createdAt,
                  ).toLocaleTimeString()}
                </span>
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
