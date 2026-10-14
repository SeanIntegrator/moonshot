import { useInstallPrompt } from '@moonshot/web-runtime/pwa';
import { Button } from '@/components/ui/button';

/** Shown only while Chromium is ready to install. Hidden after install or dismiss. */
export function InstallPrompt() {
  const { canInstall, install, dismiss } = useInstallPrompt();
  if (!canInstall) return null;

  return (
    <aside
      aria-label="Install app"
      className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-between gap-3 border-t border-border bg-surface px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
    >
      <p className="text-sm">Install KDS to open full screen, without the browser bar.</p>
      <div className="flex shrink-0 gap-2">
        <Button variant="ghost" size="lg" onClick={dismiss}>
          Not now
        </Button>
        <Button size="lg" onClick={() => void install()}>
          Install
        </Button>
      </div>
    </aside>
  );
}
