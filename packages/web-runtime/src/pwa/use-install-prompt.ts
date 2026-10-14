import { useCallback, useState, useSyncExternalStore } from 'react';

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

/**
 * Chromium fires `beforeinstallprompt` once per page load. KDS unmounts the
 * login tree and mounts the board without a navigation, so the deferred event
 * has to outlive the component that first received it.
 */
let deferredPrompt: BeforeInstallPromptEvent | null = null;
const promptListeners = new Set<() => void>();
let promptListenerAttached = false;

function emitPrompt(): void {
  for (const listener of promptListeners) listener();
}

function subscribePrompt(listener: () => void): () => void {
  promptListeners.add(listener);
  return () => {
    promptListeners.delete(listener);
  };
}

function getDeferredPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

function getServerDeferredPrompt(): null {
  return null;
}

function attachInstallPromptListener(): void {
  if (promptListenerAttached || typeof window === 'undefined') return;
  promptListenerAttached = true;
  if (isInstalledLaunch()) return;
  window.addEventListener('beforeinstallprompt', (event) => {
    // Keep the event so a click can open the browser install dialog.
    // Without preventDefault, Chrome consumes it and often shows nothing.
    event.preventDefault();
    deferredPrompt = event as BeforeInstallPromptEvent;
    emitPrompt();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    emitPrompt();
  });
}

attachInstallPromptListener();

export function useInstallPrompt(): {
  canInstall: boolean;
  install: () => Promise<InstallOutcome>;
  dismiss: () => void;
} {
  const promptEvent = useSyncExternalStore(
    subscribePrompt,
    getDeferredPrompt,
    getServerDeferredPrompt
  );
  const [dismissed, setDismissed] = useState(() => {
    if (typeof sessionStorage === 'undefined') return false;
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  });

  const install = useCallback(async (): Promise<InstallOutcome> => {
    const event = deferredPrompt;
    if (!event) return 'unavailable';
    await event.prompt();
    const choice = await event.userChoice;
    deferredPrompt = null;
    emitPrompt();
    return choice.outcome;
  }, []);

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
