/**
 * Inject café webfonts into <head>, replacing any previously injected theme fonts.
 * Idempotent per URL set — removes prior `data-moonshot-theme-font` links first.
 */
export function applyThemeWebfonts(urls: string[] | undefined): void {
  if (typeof document === 'undefined') return;

  for (const el of document.querySelectorAll('link[data-moonshot-theme-font]')) {
    el.remove();
  }

  if (!urls?.length) return;

  for (const href of urls) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute('data-moonshot-theme-font', '1');
    document.head.appendChild(link);
  }
}
