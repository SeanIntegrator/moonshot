import './index.css';
import type { FormEvent } from 'react';
import { useCallback, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppHeader } from '@/components/AppHeader';
import { LoginScreen } from '@/components/LoginScreen';
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
    recallLast,
    recalling,
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
      <LoginScreen
        form={loginForm}
        error={loginError}
        onChange={setLoginForm}
        onSubmit={handleLogin}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-full px-5 py-4 pb-6">
        <AppHeader
          cafeName={session.cafeName}
          cafeSlug={session.cafeSlug}
          username={session.username}
          recalling={recalling}
          onRecall={recallLast}
          onLogout={logout}
        />
        {error ? (
          <Alert variant="destructive" className="mt-3">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {kdsConfig ? (
          <FlowBoard
            orders={orders}
            kdsConfig={kdsConfig}
            dismissingIds={dismissingIds}
            onComplete={complete}
            onExited={finalizeDismiss}
          />
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">Loading board config…</p>
        )}
      </div>
    </TooltipProvider>
  );
}
