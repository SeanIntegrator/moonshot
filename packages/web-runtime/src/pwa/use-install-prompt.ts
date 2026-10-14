import { useCallback, useEffect, useState } from 'react';

const DISMISS_KEY = 'moonshot-pwa-install-dismissed';

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** True when this document was opened from an installed home-screen icon. */
export function isInstalledLaunch(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    window.matchMedia('(display-mode: standalone)').matches
  );
}

/**
 * Register a same-origin worker. Chromium withholds `beforeinstallprompt`
 * until a worker that registered a fetch handler controls the page.
 */
export function registerInstallServiceWorker(scriptUrl = '/sw.js'): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  const register = (): void => {
    void navigator.serviceWorker.register(scriptUrl).catch(() => {
      // The tab still works. Install stays unavailable until a worker registers.
    });
  };
  if (document.readyState === 'complete') register();
  else window.addEventListener('load', register, { once: true });
}

export function useInstallPrompt(): {
  canInstall: boolean;
  install: () => Promise<InstallOutcome>;
  dismiss: () => void;
} {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  useEffect(() => {
    if (isInstalledLaunch()) return;
    const onPrompt = (event: Event): void => {
      // Keep the event so a click can open the browser install dialog.
      // Without preventDefault, Chrome consumes it and often shows nothing.
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const onInstalled = (): void => setPromptEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = useCallback(async (): Promise<InstallOutcome> => {
    if (!promptEvent) return 'unavailable';
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    return choice.outcome;
  }, [promptEvent]);

  const dismiss = useCallback((): void => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }, []);

  return {
    canInstall: promptEvent !== null && !dismissed && !isInstalledLaunch(),
    install,
    dismiss,
  };
}
