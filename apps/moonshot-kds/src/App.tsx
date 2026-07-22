import './index.css';
import type { FormEvent } from 'react';
import { useCallback, useState } from 'react';
import { FlowBoard } from './board/FlowBoard.js';
import { useKdsConfig } from './hooks/useKdsConfig.js';
import { useKdsOrders } from './hooks/useKdsOrders.js';
import { kdsLogin } from './lib/kds-api.js';
import {
  loadKdsSession,
  saveKdsSession,
  type KdsSession,
} from './lib/kds-session.js';

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

  const {
    orders,
    error: ordersError,
    setError: setOrdersError,
    dismissingIds,
    complete,
    finalizeDismiss,
  } = useKdsOrders({
    session,
    onSessionExpired: clearExpiredSession,
  });

  const {
    kdsConfig,
    error: configError,
    setError: setConfigError,
  } = useKdsConfig({
    session,
    onSessionExpired: clearExpiredSession,
  });

  const error = loginError ?? ordersError ?? configError;

  async function handleLogin(e: FormEvent): Promise<void> {
    e.preventDefault();
    setLoginError(null);
    setOrdersError(null);
    setConfigError(null);
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
    setOrdersError(null);
    setConfigError(null);
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
    <div className="kds-shell kds-shell-board">
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
      {kdsConfig ? (
        <FlowBoard
          orders={orders}
          kdsConfig={kdsConfig}
          dismissingIds={dismissingIds}
          onComplete={complete}
          onExited={finalizeDismiss}
        />
      ) : (
        <p className="kds-placeholder">Loading board config…</p>
      )}
    </div>
  );
}
