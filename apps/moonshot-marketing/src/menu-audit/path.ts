/** Temporary route while the landing page is being redesigned. */
export const MENU_AUDIT_PATH = '/menu-audit';

export function isMenuAuditPath(pathname: string): boolean {
  const normalised = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return normalised === MENU_AUDIT_PATH;
}
