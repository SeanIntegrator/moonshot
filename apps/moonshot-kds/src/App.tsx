import './index.css';
import type { FormEvent } from 'react';
import { useCallback, useRef, useState } from 'react';
import { useGracedStatus } from '@moonshot/web-runtime/react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AppHeader } from '@/components/AppHeader';
import { LoginScreen } from '@/components/LoginScreen';
import { FlowBoard } from './board/FlowBoard.js';
import { RecentOrdersDialog } from './board/recent-orders/RecentOrdersDialog.js';
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
  const [recentOpen, setRecentOpen] = useState(false);
  const sessionRef = useRef(session);
  sessionRef.current = session;

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

  const onSessionExpired = useCallback((): void => {
    const current = sessionRef.current;
    if (current) clearExpiredSession(current);
  }, [clearExpiredSession]);

  const {
    orders,
    error: ordersError,
    setError: setOrdersError,
    connection,
    dismissingIds,
    recallSelections,
    complete,
    finalizeDismiss,
    recallOrder,
    setStatus,
  } = useKdsOrders({
    session,
    onSessionExpired: clearExpiredSession,
  });

  const displayConnection = useGracedStatus(connection);

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
    setRecentOpen(false);
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
      <div className="min-h-full">
        <div className="sticky top-0 z-50 border-b border-border bg-surface/95 px-5 pt-4 pb-3 backdrop-blur-sm supports-[backdrop-filter]:bg-surface/85">
          <AppHeader
            cafeName={session.cafeName}
            cafeSlug={session.cafeSlug}
            username={session.username}
            connection={displayConnection}
            onOpenRecentOrders={() => setRecentOpen(true)}
            onLogout={logout}
          />
          {error ? (
            <Alert variant="destructive" className="mt-3">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}
        </div>
        <div className="bg-surface px-5 pt-4 pb-6">
          {kdsConfig ? (
            <FlowBoard
              orders={orders}
              kdsConfig={kdsConfig}
              dismissingIds={dismissingIds}
              recallSelections={recallSelections}
              onComplete={complete}
              onExited={finalizeDismiss}
              onSetStatus={setStatus}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Loading board config…</p>
          )}
        </div>

        {kdsConfig ? (
          <RecentOrdersDialog
            open={recentOpen}
            onOpenChange={setRecentOpen}
            token={session.token}
            kdsConfig={kdsConfig}
            onRecall={recallOrder}
            onSessionExpired={onSessionExpired}
          />
        ) : null}
      </div>
    </TooltipProvider>
  );
}
